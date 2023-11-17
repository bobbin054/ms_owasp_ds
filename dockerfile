# A minimal Docker image based on Alpine Linux with a complete package index and only 5 MB in size!
FROM alpine

# Update the package index, install necessary packages and clean up
RUN apk update && \
    apk add nodejs npm bash git openjdk11 unzip && \
    rm -rf /var/cache/apk/*

# Set the working directory in the container
WORKDIR /usr/src/app

# Download, unpack, and clean up OWASP Dependency-Check
RUN wget -O /opt/dependency-check-8.4.2-release.zip https://github.com/jeremylong/DependencyCheck/releases/download/v8.4.2/dependency-check-8.4.2-release.zip \
    && unzip -o /opt/dependency-check-8.4.2-release.zip -d /opt/ \
    && rm /opt/dependency-check-8.4.2-release.zip

# Set the OWASP Dependency-Check environment variables
ENV PATH="/opt/dependency-check/bin:${PATH}"
# Set the OWASP Dependency-Check data directory
ENV DEPENDENCY_CHECK_DATA_DIR="/opt/dependency-check/data"
# Create a volume for OWASP Dependency-Check data
VOLUME ["${DEPENDENCY_CHECK_DATA_DIR}"]
# Disable git interactive prompt
ENV GIT_TERMINAL_PROMPT=0

# Copy package.json to the working directory
COPY package.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY tsconfig.json .
COPY src ./src

# Compile TypeScript code
RUN npm run build

# Expose the port that the app will run on
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]

# docker build -t alpine .
# docker run --rm -it -p 3000:3000 -v owasp_data:/opt/dependency-check/data alpine bash