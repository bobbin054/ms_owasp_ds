# Use the official Node.js image based on Alpine Linux
FROM alpine

# Update the package index and install necessary packages in one step
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

# Copy package.json to the working directory
COPY package.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY tsconfig.json .
COPY src ./src

# Compile TypeScript code
RUN npm run build

# Expose the port that the app will run on
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]
