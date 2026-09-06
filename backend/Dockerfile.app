# Thin wrapper image: copies the pre-built Spring Boot fat jar.
# Build it from the repo root AFTER packaging on the host:
#   ./mvnw -DskipTests package
#   docker build -f Dockerfile.app -t sih26043-app:step2 .
FROM eclipse-temurin:21-jre

WORKDIR /app
COPY app/target/app-0.0.1-SNAPSHOT.jar /app/app.jar

EXPOSE 8081
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
