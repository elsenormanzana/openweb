#!/bin/sh
set -eu

STACK_NAME="${STACK_NAME:-openweb}"
API_SERVICE="${STACK_NAME}_${API_SERVICE_BASENAME:-api}"
WEB_SERVICE="${STACK_NAME}_${WEB_SERVICE_BASENAME:-web}"

API_MIN="${API_MIN_REPLICAS:-2}"
API_MAX="${API_MAX_REPLICAS:-10}"
WEB_MIN="${WEB_MIN_REPLICAS:-2}"
WEB_MAX="${WEB_MAX_REPLICAS:-10}"
SCALE_UP_CPU="${SCALE_UP_CPU:-70}"
SCALE_DOWN_CPU="${SCALE_DOWN_CPU:-25}"
CHECK_INTERVAL_SECONDS="${CHECK_INTERVAL_SECONDS:-30}"
COOLDOWN_SECONDS="${COOLDOWN_SECONDS:-120}"

last_scaled_at=0

current_replicas() {
  docker service inspect --format '{{.Spec.Mode.Replicated.Replicas}}' "$1" 2>/dev/null || echo 0
}

average_cpu() {
  service_name="$1"
  task_ids=$(docker ps -q --filter "label=com.docker.swarm.service.name=${service_name}")
  if [ -z "$task_ids" ]; then
    echo 0
    return
  fi

  docker stats --no-stream --format '{{.CPUPerc}}' $task_ids \
    | tr -d '%' \
    | awk '{sum+=$1; count+=1} END { if (count==0) print 0; else printf "%.0f", sum/count }'
}

scale_service() {
  service_name="$1"
  min_replicas="$2"
  max_replicas="$3"

  replicas=$(current_replicas "$service_name")
  cpu=$(average_cpu "$service_name")
  now=$(date +%s)

  if [ $((now - last_scaled_at)) -lt "$COOLDOWN_SECONDS" ]; then
    return
  fi

  if [ "$cpu" -ge "$SCALE_UP_CPU" ] && [ "$replicas" -lt "$max_replicas" ]; then
    target=$((replicas + 1))
    echo "[autoscaler] scale up ${service_name}: ${replicas} -> ${target} (cpu=${cpu}%)"
    docker service scale "${service_name}=${target}" >/dev/null
    last_scaled_at="$now"
    return
  fi

  if [ "$cpu" -le "$SCALE_DOWN_CPU" ] && [ "$replicas" -gt "$min_replicas" ]; then
    target=$((replicas - 1))
    echo "[autoscaler] scale down ${service_name}: ${replicas} -> ${target} (cpu=${cpu}%)"
    docker service scale "${service_name}=${target}" >/dev/null
    last_scaled_at="$now"
    return
  fi
}

echo "[autoscaler] started for stack ${STACK_NAME}"
while true; do
  scale_service "$API_SERVICE" "$API_MIN" "$API_MAX"
  scale_service "$WEB_SERVICE" "$WEB_MIN" "$WEB_MAX"
  sleep "$CHECK_INTERVAL_SECONDS"
done
