FROM eclipse-temurin:17-jdk-jammy AS build

WORKDIR /workspace/services/control-api

COPY services/control-api/gradlew .
COPY services/control-api/gradle ./gradle
COPY services/control-api/settings.gradle.kts services/control-api/build.gradle.kts services/control-api/gradle.lockfile ./

RUN ./gradlew dependencies --no-daemon

COPY services/control-api/src ./src

RUN ./gradlew bootJar --no-daemon

FROM build AS quality

RUN ./gradlew ktlintCheck test --no-daemon

FROM eclipse-temurin:17-jre-jammy AS runtime

RUN apt-get update \
    && apt-get install --yes --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system app \
    && useradd --system --gid app --create-home app

WORKDIR /app

COPY --from=build --chown=app:app /workspace/services/control-api/build/libs/control-api-0.1.0.jar app.jar

USER app

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
