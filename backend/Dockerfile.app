# Thin wrapper image: copies a pre-built Spring Boot fat jar.
# Build it from the repo root AFTER packaging on the host:
#   ./mvnw -DskipTests package
#   docker compose up -d --build
#
# The jar to embed is chosen per service with the JAR_FILE build arg
# (see docker-compose.yml); the default is the source-service jar.
FROM eclipse-temurin:21-jre

WORKDIR /app
ARG JAR_FILE=source-service/target/source-service-0.0.1-SNAPSHOT.jar
COPY ${JAR_FILE} /app/app.jar

EXPOSE 8081 8083
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
