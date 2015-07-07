FROM    centos:centos6

# Enable EPEL for Node.js
RUN     rpm -Uvh http://download.fedoraproject.org/pub/epel/6/i386/epel-release-6-8.noarch.rpm
# Install Node.js and npm
RUN     yum install -y npm

# Bundle app source
COPY . /src

# Install app dependencies
RUN cd /src; npm install
RUN cd /src; ./node_modules/grunt-cli/bin/grunt 

# Set environment
ENV NODE_ENV production

EXPOSE 3000 

WORKDIR /src
CMD ["node", "server.js"]

