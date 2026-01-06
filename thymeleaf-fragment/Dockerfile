FROM gradle:jdk25-corretto AS build
WORKDIR /home/gradle/project
COPY --chown=gradle:gradle . .
RUN gradle --no-daemon bootJar -x test && \
    cp ./build/libs/thymeleaf-fragment-0.0.1-SNAPSHOT.jar /tmp/app.jar

FROM amazoncorretto:25-headless
WORKDIR /app
COPY --from=build /tmp/app.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","app.jar"]
