IMAGE_NAME=pingwin02/node-ffmpeg-build
DOCKERFILE=Dockerfile-base

.PHONY: all build push clean

all: build push

build:
	docker build -f $(DOCKERFILE) -t $(IMAGE_NAME) .

push:
	docker push $(IMAGE_NAME)

clean:
	docker system prune -af