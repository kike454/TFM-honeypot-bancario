# FinConnect

![Deploy to EC2](https://github.com/kike454/TFM-honeypot-bancario/actions/workflows/deploy.yml/badge.svg)


## Descripción

Trabajo de Fin de Máster centrado en el desarrollo y despliegue de un **honeypot bancario de media interacción** que simula un agregador de cuentas PSD2.
El sistema está diseñado para atraer, detectar y analizar ciberataques dirigidos contra aplicaciones bancarias, capturando la actividad de los atacantes y visualizándola en tiempo real mediante un panel de control para el equipo Blue Team.

## Temática

Implementación de honeypots como herramientas de defensa avanzada. El proyecto integra una aplicación bancaria señuelo con un pipeline de detección y análisis de amenazas basado en el stack **ELK** (Elasticsearch, Logstash, Kibana), desplegado en **AWS EC2** mediante arquitectura por capas y despliegue continuo (CD) con **GitHub Actions**.

## Tecnologías utilizadas

![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Elasticsearch](https://img.shields.io/badge/Elasticsearch-005571?logo=elasticsearch&logoColor=white)
![Kibana](https://img.shields.io/badge/Kibana-005571?logo=kibana&logoColor=white)
![AWS](https://img.shields.io/badge/AWS%20EC2-FF9900?logo=amazonaws&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?logo=nginx&logoColor=white)

## Arquitectura

El sistema se compone de:

- **Frontend** (Next.js + TypeScript): interfaz señuelo que replica un portal bancario PSD2.
- **Backend** (FastAPI + Python): lógica de negocio, captura de credenciales, detección de patrones de ataque y generación de datos bancarios simulados.
- **Base de datos** (PostgreSQL): almacenamiento de eventos, credenciales capturadas y alertas de seguridad.
- **Stack ELK**: recolección (Filebeat), procesamiento (Logstash), indexación (Elasticsearch) y visualización (Kibana) de la actividad maliciosa.
- **Nginx**: proxy inverso y terminación SSL/TLS.
- **CI/CD**: despliegue automático en AWS EC2 mediante GitHub Actions.

## Aplicación desplegada

La aplicación se encuentra desplegada y accesible públicamente en:

**https://finconnect.store**

El acceso como usuario se realiza mediante registro con verificación OTP por correo electrónico. Una vez autenticado, se accede al panel bancario simulado, donde es posible consultar cuentas, saldos y movimientos, así como explorar el flujo de consentimiento PSD2.

> El panel de monitorización Blue Team (Kibana) no está expuesto públicamente por razones de seguridad, siendo accesible únicamente mediante túnel SSH.

## Documentación API

La documentación interactiva de la API (Swagger UI) está disponible en:

**https://finconnect.store/api/docs**

La API sigue el estándar **Berlin Group NextGenPSD2**, exponiendo los servicios de acceso a cuentas (AIS) y el flujo de consentimiento característicos del Open Banking europeo.

---

**Enrique Collado Muñoz**
Máster de Ciberseguridad CEU SAN PABLO
Universidad CEU San Pablo

---

```
MIT License

Copyright (c) 2026 Enrique Collado Muñoz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
