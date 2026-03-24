.PHONY: up down restart build logs logs-backend logs-frontend ps test test-backend test-frontend shell-backend shell-frontend health clean dev seed seed-force setup create-user

# Levantar todos los servicios
up:
	docker compose up -d

# Bajar todos los servicios
down:
	docker compose down

# Restart de todos los servicios (rebuild + up)
restart:
	docker compose down
	docker compose up -d --build

# Rebuild imágenes sin cache
build:
	docker compose build --no-cache

# Logs de todos los servicios (follow)
logs:
	docker compose logs -f

# Logs por servicio
logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

# Estado de los contenedores
ps:
	docker compose ps

# Tests
test:
	docker compose exec backend npm test
	docker compose exec frontend npm test

test-backend:
	docker compose exec backend npm test

test-frontend:
	docker compose exec frontend npm test

# Shell dentro de los contenedores
shell-backend:
	docker compose exec backend sh

shell-frontend:
	docker compose exec frontend sh

# Health check del backend
health:
	@docker compose exec backend wget -qO- http://localhost:3001/api/health || echo "Backend no responde"

# Desarrollo local (sin Docker)
dev:
	cd backend && npm run dev & cd frontend && npm run dev & wait

# Seed de datos de desarrollo (local, sin Docker)
seed:
	cd backend && node scripts/seed.js

# Seed sin confirmacion
seed-force:
	cd backend && node scripts/seed.js --force

# Setup inicial del proyecto (git hooks, dependencias)
setup:
	git config core.hooksPath .githooks
	cd backend && npm install
	cd frontend && npm install
	@echo "Setup completo. Git hooks activados."

# Crear usuario (uso: make create-user U=username P=password)
create-user:
ifndef U
	$(error Uso: make create-user U=username P=password)
endif
ifndef P
	$(error Uso: make create-user U=username P=password)
endif
	docker compose exec backend node src/scripts/create-user.js "$(U)" "$(P)"

# Limpiar todo (contenedores, imágenes, volúmenes huérfanos)
clean:
	docker compose down --rmi local --remove-orphans
