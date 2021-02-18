REPO = asaswap

all: contracts

contracts:
	poetry run yarn algob compile

clean:		## Remove python cache files
	find . -name '__pycache__' | xargs rm -rf
	find . -name '*.pyc' -delete
	rm -rf .pytest_cache

image:		## Build the docker image
	make clean
	docker build \
		-t $(REPO) .

tests: 		## Run eslint and tests
	docker run -it --rm \
		$(REPO) yarn lint && poetry run yarn test
