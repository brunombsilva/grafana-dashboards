ARG GRAFANA_VERSION="5.3.0-beta3"
#ARG GRAFANA_VERSION="5.2.4"

FROM grafana/grafana:${GRAFANA_VERSION}

USER root

RUN apt-get update && apt-get install -qq -y jq

USER grafana

ARG GF_INSTALL_PLUGINS="grafana-clock-panel, grafana-simple-json-datasource, briangann-datatable-panel"

RUN if [ ! -z "${GF_INSTALL_PLUGINS}" ]; then \
    OLDIFS=$IFS; \
        IFS=','; \
    for plugin in ${GF_INSTALL_PLUGINS}; do \
        IFS=$OLDIFS; \
        grafana-cli --pluginsDir "$GF_PATHS_PLUGINS" plugins install ${plugin}; \
    done; \
fi

COPY ./provisioning/ /etc/grafana/provisioning/
COPY ./grafana.ini /etc/grafana/grafana.ini
COPY ./entrypoint.sh /

WORKDIR /etc/grafana/provisioning/

USER root
RUN chown -R grafana:grafana .

ENTRYPOINT [ "/entrypoint.sh" ]
