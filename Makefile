IMAGE_NAME=pingwin02/node-ffmpeg-build
DOCKERFILE=Dockerfile-base

.PHONY: all build push clean

all: build push clean

build:
	docker build --no-cache --file $(DOCKERFILE) --tag $(IMAGE_NAME) .

push:
	docker push $(IMAGE_NAME)

clean:
	docker system prune -af