FROM docker:27-cli
WORKDIR /autoscaler
COPY deploy/scripts/autoscale.sh /autoscaler/autoscale.sh
RUN chmod +x /autoscaler/autoscale.sh
CMD ["/autoscaler/autoscale.sh"]
