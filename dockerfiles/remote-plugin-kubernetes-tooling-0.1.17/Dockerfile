# Copyright (c) 2019 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

FROM ${BUILD_ORGANIZATION}/${BUILD_PREFIX}-theia-endpoint-runtime:next as endpoint
FROM centos:7

ENV HOME=/home/theia
COPY --from=endpoint /home/theia /home/theia
COPY --from=endpoint /projects /projects
COPY --from=endpoint /etc/passwd /etc/passwd
COPY --from=endpoint /etc/group /etc/group
COPY --from=endpoint /entrypoint.sh /entrypoint.sh

ENV KUBECTL_VERSION v1.14.0
ENV HELM_VERSION v2.13.1
ENV BUILDAH_ISOLATION=chroot
ADD etc/docker.sh /usr/local/bin/docker

RUN curl -sL https://rpm.nodesource.com/setup_10.x | bash - && \
    yum install -y which nodejs buildah && \
    curl https://storage.googleapis.com/kubernetes-release/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl -o /usr/local/bin/kubectl && \
    chmod +x /usr/local/bin/kubectl && \
    curl -o- -L https://storage.googleapis.com/kubernetes-helm/helm-${HELM_VERSION}-linux-amd64.tar.gz | tar xvz -C /usr/local/bin --strip 1 && \
    helm init --client-only

ENTRYPOINT ["/entrypoint.sh"]
