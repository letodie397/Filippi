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
npm run build:locations:full  # CEPBrasil + IBGE → JSON do app
npm run build:locations       # só rebuild a partir dos dados em data/
npm run geocode:missing       # GPS dos bairros sem coordenada
npm run compare:cepbrasil     # relatório de cobertura (gerado em data/, não versionado)
npm run audit:locations       # resumo rápido de GPS por cidade
npm run test                  # testes de mapa + Firebase
```

### Bairros históricos (nomes antigos de igrejas)

Igrejas antigas podem manter nomes de bairros extintos. Cadastre em `data/historical-bairros.json` (ex.: Ilha da Jussara → Ulisses Guimarães, Vila Velha).

### Cadastro oficial ICM (Maranata)

As 1.060 igrejas do ES vêm da [consulta pública ICM](https://consulta-publica-igrejas.presbiterio.org.br) e ficam em `src/data/maranata-churches.generated.json`:

```bash
npm run build:maranata          # baixa API + gera JSON do app
npm run geocode:maranata        # GPS de cada igreja pelo endereço (Nominatim)
npm run geocode:maranata:missing  # só igrejas sem GPS no cache
npm run compare:maranata        # relatório de bairros sem match no mapa
```

Aliases de bairro Maranata → mapa local: `data/maranata-bairro-aliases.json`.
