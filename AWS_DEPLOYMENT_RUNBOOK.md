# SIH26043 Backend — AWS Deployment Runbook & Architecture Documentation

This document records the complete architecture, provisioning actions, network engineering decisions, and operational commands executed for the production deployment of the SIH26043 backend stack on Amazon Web Services (AWS).

---

## 1. System Architecture & Topology

The backend consists of 6 Spring Boot 4.1.1 / Java 21 microservices orchestrated via Docker Compose on an Amazon EC2 instance, with persistent data decoupled into a managed Amazon RDS PostgreSQL 16 database cluster.

```
                    Internet
                       │
              ┌────────▼─────────┐
              │  DNS A Record    │  api.bhavik.site (Cloudflare DNS)
              │  13.205.158.156  │  Points to AWS Elastic IP
              └────────┬─────────┘
                       │ Ports 80, 443
        ┌──────────────▼──────────────────────────────────────────────┐
        │  EC2 m7i-flex.large (Ubuntu 24.04 LTS) — ap-south-1         │
        │  Static Elastic IP: 13.205.158.156                          │
        │  Security Group: sg-029c3ddb9249dd509 (22, 80, 443)         │
        │                                                             │
        │   ┌─────────────────────────────────────────────────────┐   │
        │   │ Caddy Gateway (:80 / :443)                          │   │
        │   │ - Automatic Let's Encrypt TLS (ACME)                │   │
        │   │ - Path-based Reverse Proxy                          │   │
        │   └──┬─────────────┬─────────────┬─────────────┬────────┘   │
        │      │             │             │             │            │
        │   eureka-server  source-service  problem-srv   evaluation   │
        │     (:8761)        (:8081)        (:8082)       (:8083)     │
        │                                                             │
        │   portal-service                 codejudge-service          │
        │     (:8084)                        (:8085)                  │
        │                                                             │
        │  EBS Named Volumes:                                         │
        │   evidence, portal-files, codejudge-workspaces, caddy_data  │
        └──────────────────────────────┬──────────────────────────────┘
                                       │ Port 5432 (Internal VPC only)
              ┌────────────────────────▼────────────────────────┐
              │  Amazon RDS PostgreSQL 16.15 (db.t4g.micro)    │
              │  Endpoint: sih-postgres.cv4ygog0qn0f...         │
              │  Security Group: sg-08b4f01c9d577e51c           │
              │  Databases: 5 isolated per-service schemas      │
              │  Private Subnet (No Internet Exposure)          │
              └─────────────────────────────────────────────────┘
```

---

## 2. Infrastructure Inventory & Provisioned Resources

| Resource | AWS Identifier | Details / Specs |
| :--- | :--- | :--- |
| **AWS Region** | `ap-south-1` | Asia Pacific (Mumbai) |
| **VPC** | `vpc-081e37caf77162426` | Default VPC (`172.31.0.0/16`) |
| **EC2 Instance** | `i-0a50e5f50467a5aae` | `m7i-flex.large` (2 vCPUs, 8 GB RAM, 30 GB gp3 SSD) |
| **Elastic IP** | `13.205.158.156` | Attached to `i-0a50e5f50467a5aae` (`eipalloc-0a5aa855b7c4c4782`) |
| **SSH Key Pair** | `sih-deploy-key` | Private key stored at `C:\Users\Bhavik\.ssh\sih-deploy-key.pem` |
| **EC2 Security Group** | `sg-029c3ddb9249dd509` (`sih-backend-ec2-sg`) | Inbound: 22 (SSH), 80 (HTTP), 443 (HTTPS) from `0.0.0.0/0` |
| **RDS Security Group** | `sg-08b4f01c9d577e51c` (`sih-backend-rds-sg`) | Inbound: 5432 (Postgres) exclusively from `sg-029c3ddb9249dd509` |
| **RDS DB Subnet Group**| `sih-db-subnet-group` | Multi-AZ across `ap-south-1a`, `ap-south-1b`, `ap-south-1c` |
| **RDS Instance** | `sih-postgres` | PostgreSQL 16.15, `db.t4g.micro`, 20 GB gp3 storage |
| **RDS Endpoint** | `sih-postgres.cv4ygog0qn0f.ap-south-1.rds.amazonaws.com` | Private VPC address, Port 5432 |
| **EICE Endpoint** | `eice-00496df579c67a310` | EC2 Instance Connect Endpoint for outbound firewall traversal |

---

## 3. Network Engineering: Outbound Port 22 Traversal via EICE

### The Challenge
During initial connection verification, standard outbound SSH (`tcp:22`) timed out. Diagnostics revealed that the local Wi-Fi router / firewall blocks outbound port 22 connections.

### The Solution: EC2 Instance Connect Endpoint (EICE)
Rather than requiring VPNs or custom firewall modifications, we provisioned an **AWS EC2 Instance Connect Endpoint** (`eice-00496df579c67a310`) inside the VPC. 

This enables native OpenSSH and SCP traffic to be tunneled through the AWS HTTPS API (port 443) using the AWS CLI `open-tunnel` command:

```powershell
# SSH through EICE tunnel
ssh -o "ProxyCommand=aws ec2-instance-connect open-tunnel --instance-id i-0a50e5f50467a5aae --remote-port 22" -i C:\Users\Bhavik\.ssh\sih-deploy-key.pem ubuntu@i-0a50e5f50467a5aae

# SCP file upload through EICE tunnel
scp -o "ProxyCommand=aws ec2-instance-connect open-tunnel --instance-id i-0a50e5f50467a5aae --remote-port 22" -i C:\Users\Bhavik\.ssh\sih-deploy-key.pem <file> ubuntu@i-0a50e5f50467a5aae:/destination
```

---

## 4. Database Setup & Automated Flyway Migrations

### 4.1 Per-Service Database Initialization
Because Amazon RDS is private and unreachable from the internet, [`backend/bootstrap.sh`](file:///c:/Users/Bhavik/Documents/sih-round-2/final/Manthan-Churning-Ideas-into-Solutions/backend/bootstrap.sh) was executed on the EC2 instance inside the VPC to initialize 5 separate databases on the RDS instance:
- `sih_source`
- `sih_problem`
- `sih_eval`
- `sih_portal`
- `sih_codejudge`

### 4.2 Automated Flyway Migration Results
Upon startup of the Spring Boot containers, Flyway connected to RDS and applied all migrations automatically:

| Service | Schema Version | Migrations Applied | Status |
| :--- | :--- | :--- | :--- |
| **source-service** | v3 | 3 applied | Schema created, dev users & pool evaluators seeded |
| **problem-service** | v5 | 5 applied | Problem domain definitions, access rules created |
| **evaluation-service** | v10 | 10 applied | Multi-pool evaluation pipeline, rubric scores schema |
| **portal-service** | v10 | 10 applied | Public problem portal, submissions, reviews schema |
| **codejudge-service** | v3 | 3 applied | Automated repository evaluation history created |
| **Total** | — | **31 Migrations** | **100% Successful** |

---

## 5. Configuration & JVM Memory Management

### 5.1 JVM Memory Bounds
Uncapped JVMs on an 8 GB host would easily crash the server when multiple services boot simultaneously. In [`backend/docker-compose.prod.yml`](file:///c:/Users/Bhavik/Documents/sih-round-2/final/Manthan-Churning-Ideas-into-Solutions/backend/docker-compose.prod.yml), every service is constrained:
```yaml
environment:
  JAVA_TOOL_OPTIONS: "-XX:MaxRAMPercentage=60 -XX:+UseSerialGC"
mem_limit: 800m  # 500m for eureka-server
restart: unless-stopped
```

### 5.2 Real-Time Resource Consumption
Verified metrics under active multi-container load:
- **Host Total RAM:** 7.6 GiB
- **Host Used RAM:** **2.3 GiB** (Total across all 6 running JVM microservices)
- **Host Available Headroom:** **5.3 GiB**
- **CPU Idle:** >98%

### 5.3 Service Registry (Eureka)
All 5 business microservices successfully registered with `eureka-server` and are marked `UP`:
- `SOURCE-SERVICE` (port 8081)
- `PROBLEM-SERVICE` (port 8082)
- `EVALUATION-SERVICE` (port 8083)
- `PORTAL-SERVICE` (port 8084)
- `CODEJUDGE-SERVICE` (port 8085)

---

## 6. Domain & DNS Configuration (Cloudflare)

### Key Finding
Authoritative NS queries for `bhavik.site` revealed:
- `razvan.ns.cloudflare.com`
- `kristina.ns.cloudflare.com`

Although the domain was purchased at GoDaddy, DNS resolution is actively delegated to **Cloudflare**. DNS records must be added in Cloudflare.

### Required DNS Record
In the Cloudflare Dashboard for `bhavik.site`:
- **Record Type:** `A`
- **Name:** `api` (resolves to `api.bhavik.site`)
- **IPv4 Address:** `13.205.158.156`
- **Proxy Status:** **DNS Only** (Grey Cloud icon)
- **TTL:** `Auto`

---

## 7. Gateway & Automatic SSL (Caddy)

[`backend/gateway/Caddyfile.prod`](file:///c:/Users/Bhavik/Documents/sih-round-2/final/Manthan-Churning-Ideas-into-Solutions/backend/gateway/Caddyfile.prod) is configured to handle reverse proxy routing and automatic SSL:
```caddy
api.bhavik.site {
    tls themanthanedu@gmail.com
    encode gzip

    @source path /auth /auth/* /users /users/* /registration /registration/* /reviewer/registrations /reviewer/registrations/* /source/accounts /source/accounts/* /sources /sources/*
    handle @source {
        reverse_proxy source-service:8081
    }

    @problem path /domains /domains/* /problems /problems/* /audit /audit*
    handle @problem {
        reverse_proxy problem-service:8082
    }

    @evaluation path /evaluation /evaluation/*
    handle @evaluation {
        reverse_proxy evaluation-service:8083
    }

    @portal path /portal /portal/*
    handle @portal {
        reverse_proxy portal-service:8084
    }

    @codejudge path /codejudge /codejudge/*
    handle @codejudge {
        reverse_proxy codejudge-service:8085
    }

    @eureka path /eureka /eureka/*
    handle @eureka {
        reverse_proxy eureka-server:8761
    }

    handle {
        reverse_proxy source-service:8081
    }
}
```

### 7.1 Live Certificate Issuance Log
```json
{"level":"info","logger":"http.acme_client","msg":"trying to solve challenge","identifier":"api.bhavik.site","challenge_type":"http-01","ca":"https://acme-v02.api.letsencrypt.org/directory"}
{"level":"info","logger":"http","msg":"served key authentication","identifier":"api.bhavik.site","challenge":"http-01","remote":"23.178.112.104:42747"}
{"level":"info","logger":"http.acme_client","msg":"authorization finalized","identifier":"api.bhavik.site","authz_status":"valid"}
{"level":"info","logger":"tls.obtain","msg":"certificate obtained successfully","identifier":"api.bhavik.site","issuer":"acme-v02.api.letsencrypt.org-directory"}
```

---

## 8. Verification & Live Test Results

| Test Endpoint | Protocol / Method | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| `http://api.bhavik.site` | `HTTP GET` | 308 Permanent Redirect to HTTPS | `308 Location: https://api.bhavik.site/` |  PASS |
| `https://api.bhavik.site` | `TLS Handshake` | Valid Let's Encrypt Certificate | `TLSv1.3 / ALPN h2 / Trusted Let's Encrypt` |  PASS |
| `https://api.bhavik.site/eureka/apps` | `HTTPS GET` | All 5 microservices registered | `HTTP 200 (UP_5_)` |  PASS |
| `https://api.bhavik.site/v3/api-docs` | `HTTPS GET` | OpenAPI JSON schema | `HTTP 200 (SIH26043 OpenAPI 3.1.0 JSON)` |  PASS |
| `https://api.bhavik.site/domains` | `HTTPS GET` | Problem domains hierarchy from RDS | `HTTP 200 (12 Level-1 Domains with trees)` |  PASS |
| `https://api.bhavik.site/auth/login` | `HTTPS POST` | OTP challenge issue | `HTTP 200 (challengeId issued)` |  PASS |
| `https://api.bhavik.site/auth/verify-otp` | `HTTPS POST` | JWT access + refresh tokens | `HTTP 200 (Valid HS256 JWT minted)` |  PASS |
| `https://api.bhavik.site/problems` | `HTTPS GET (no auth)` | Security block | `HTTP 401 Unauthorized` |  PASS |
| `https://api.bhavik.site/problems` | `HTTPS GET (Bearer JWT)` | Authenticated data access | `HTTP 200 OK` |  PASS |

---

## 9. Frontend Portals & Client Integration (AWS Production Gateway)

Following successful TLS termination and health verification at `https://api.bhavik.site`, all frontend portals, client apps, seed scripts, and integration test runners were reconfigured to target the deployed AWS gateway:

### 9.1 Frontend Applications Reconfigured

| Application | Path / File | Configuration Key / Mechanism | Configured Target |
| :--- | :--- | :--- | :--- |
| **Submitter Portal** | `frontend/submitter-ui/src/main.js` | `state.baseUrl` / `localStorage('sih_portal_base')` | `https://api.bhavik.site` |
| **Reviewer Portal** | `frontend/reviewer-ui/app.js` | `ApiClient.getBaseUrl()` / `localStorage('api_base_url')` | `https://api.bhavik.site` |
| **Admin UI** | `frontend/admin-ui/js/api.js` | `getApiBase()` / `localStorage('api_base_url')` | `https://api.bhavik.site` |
| **Evaluator UI** | `frontend/evaluator-ui/src/lib/api.ts` | `VITE_API_BASE_URL` fallback | `https://api.bhavik.site` |
| **Evaluator UI (Vite Proxy)** | `frontend/evaluator-ui/vite.config.ts` | Dev proxy targets (`/auth`, `/evaluation`, `/problems`, `/portal`) | `https://api.bhavik.site` |
| **Evaluator UI Env** | `frontend/evaluator-ui/.env` & `.env.example` | `VITE_API_BASE_URL` | `https://api.bhavik.site` |
| **Innovation Portal Web** | `frontend/innovation-portal-web/src/services/apiClient.ts` | `VITE_API_BASE_URL` fallback | `https://api.bhavik.site` |
| **Innovation Portal Web Env** | `frontend/innovation-portal-web/.env` & `.env.example` | `VITE_API_BASE_URL` | `https://api.bhavik.site` |
| **Innovation Portal Web (Dist)**| `frontend/innovation-portal-web/dist/assets/index-*.js` | Bundled default base URL `p1` | `https://api.bhavik.site` |

### 9.2 Verification Tools & Test Runners Reconfigured

| Tool / Script | File Path | Mechanism |
| :--- | :--- | :--- |
| **Multi-Portal Verification Suite** | `backend/verify_all_portals.py` | `BASE_URL = os.environ.get('API_GATEWAY_URL', 'https://api.bhavik.site')` |
| **Evaluators Pool Test** | `backend/test_all_evaluators.py` | `BASE_URL = os.environ.get('API_GATEWAY_URL', 'https://api.bhavik.site')` |
| **KYC Roundtrip Test** | `backend/test_kyc_flow.py` | `BASE_URL = os.environ.get('API_GATEWAY_URL', 'https://api.bhavik.site')` |
| **Student Submissions Test** | `backend/test_submit.py` | `BASE_URL = os.environ.get('API_GATEWAY_URL', 'https://api.bhavik.site')` |
| **PowerShell Registration Seeder**| `backend/seed-sample-cases.ps1` | `param([string]$GatewayUrl = "https://api.bhavik.site")` |
| **Registration Wizard App** | `backend/registration-wizard/wizard-app.js` & `index.html` | Default input & `localStorage` fallback to `https://api.bhavik.site` |
| **SIH Test UI Console** | `backend/test-ui/index.html` | Default input & `localStorage` fallback to `https://api.bhavik.site` |

---

## 10. Operational Commands & Maintenance Runbook

### 10.1 SSH Login to EC2
```powershell
ssh -o "ProxyCommand=aws ec2-instance-connect open-tunnel --instance-id i-0a50e5f50467a5aae --remote-port 22" -i C:\Users\Bhavik\.ssh\sih-deploy-key.pem ubuntu@i-0a50e5f50467a5aae
```

### 10.2 Starting the Gateway (after DNS is saved)
```bash
cd /home/ubuntu/app/backend
docker compose -f docker-compose.prod.yml up -d gateway
```

### 10.3 Checking Stack Status & Logs
```bash
# View container status
docker compose -f docker-compose.prod.yml ps

# View gateway logs & SSL provisioning
docker compose -f docker-compose.prod.yml logs -f gateway

# View logs for a specific service
docker compose -f docker-compose.prod.yml logs --tail 100 -f source-service
```

### 10.4 Restarting a Service
```bash
docker compose -f docker-compose.prod.yml restart source-service
```

### 10.5 Updating or Re-deploying Code
1. Re-package jars locally:
   ```powershell
   cd backend
   .\mvnw.cmd -DskipTests package
   ```
2. Upload new jar via SCP:
   ```powershell
   scp -o "ProxyCommand=aws ec2-instance-connect open-tunnel --instance-id i-0a50e5f50467a5aae --remote-port 22" -i C:\Users\Bhavik\.ssh\sih-deploy-key.pem source-service/target/source-service-0.0.1-SNAPSHOT.jar ubuntu@i-0a50e5f50467a5aae:/home/ubuntu/app/backend/source-service/target/
   ```
3. Rebuild and restart the container:
   ```bash
   cd /home/ubuntu/app/backend
   docker compose -f docker-compose.prod.yml up -d --build source-service
   ```
