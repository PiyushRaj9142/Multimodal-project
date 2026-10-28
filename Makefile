.PHONY: help install test run-backend run-frontend seed-demo build-frontend clean

help:
	@echo "Multimodal Attendance & Engagement Agent Commands:"
	@echo "  make install        Install backend and frontend dependencies"
	@echo "  make test           Run backend pytest test suite"
	@echo "  make seed-demo      Initialize database and seed demo data"
	@echo "  make run-backend    Start FastAPI backend server on port 8000"
	@echo "  make run-frontend   Start Next.js frontend dev server on port 3000"
	@echo "  make build-frontend Build production bundle for Next.js frontend"
	@echo "  make clean          Clean temporary files and cache"

install:
	python3 -m venv venv
	./venv/bin/pip install --upgrade pip
	./venv/bin/pip install -r backend/requirements.txt
	cd frontend && npm install

test:
	./venv/bin/pytest -v

seed-demo:
	./venv/bin/python3 scripts/seed_demo.py

run-backend:
	./venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

run-frontend:
	cd frontend && npm run dev

build-frontend:
	cd frontend && npm run build

clean:
	rm -rf __pycache__ .pytest_cache data/uploads/* data/reports/*
