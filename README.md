# ICM Pedidos — Espírito Santo

Sistema PWA para gestão de pedidos e prestadores de serviço da Igreja Cristã Maranata no Espírito Santo.

**Acesso online:** [https://letodie397.github.io/Filippi/](https://letodie397.github.io/Filippi/)

## Funcionalidades

- Cadastro de prestadores de serviço por bairro, cidade ou estado
- Cadastro de pedidos com identificação automática de bairro/cidade pelo nome da igreja
- Alertas de proximidade entre pedidos e técnicos (raio de 15 km)
- Funciona offline como PWA (dados salvos no dispositivo)

## Desenvolvimento local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build          # build local (base /)
npm run build:pages    # build para GitHub Pages (base /Filippi/)
```

## Firebase (Realtime Database)

Dados sincronizados em tempo real entre dispositivos via Firebase RTD.

### Configuração no console Firebase

1. [Console Firebase](https://console.firebase.google.com/) → projeto **filippi-82725**
2. **Build → Realtime Database → Criar banco** (região `us-central1` ou mais próxima)
3. **Regras** → colar o conteúdo de `database.rules.json` → Publicar
4. Plano **Spark (grátis)** suporta uso simultâneo da equipe

### Estrutura otimizada

```
icm/
  technicians/{id}   → prestadores
  orders/{id}        → pedidos
  indexes/pedidos/   → evita número duplicado entre dispositivos
  meta/              → versão do schema
```

- **1 listener** por coleção (mínimo de leituras)
- **Transações** em edições simultâneas (campo `v` = versão)
- **Cache offline** automático do Firebase no PWA

## Deploy

O deploy é automático via GitHub Actions ao fazer push na branch `main`.

Para habilitar o Pages pela primeira vez: **Settings → Pages → Source: GitHub Actions**.

## Scripts úteis

```bash
npm run build:locations   # regenera base de bairros/cidades
npm run audit:locations   # audita cobertura GPS
npm run geocode:all       # geocodifica bairros faltantes
npm run test              # testes de mapa + Firebase
npm run test:locations    # só localização/GPS
npm run test:firebase     # só leitura/escrita/concorrência Firebase
```
