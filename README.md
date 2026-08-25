# Sistema de Automação de Manutenção de Frotas e Ferramentas

## Integrantes do Grupo
* Gustavo Vieira
* Yasmin Vier Scotti
* Alessandro Zientara
* Abel Felipe
* Pedro Neto

## Resumo da Automação Proposta

Empresas com frotas de veículos e ferramentas de uso operacional constante precisam garantir
que esses ativos estejam sempre em condições seguras de uso, cumprindo manutenções preventivas
e corretivas dentro dos prazos legais exigidos por órgãos fiscalizadores (DOT, INMETRO,
Vigilância Sanitária, entre outros, dependendo do setor).

Atualmente esse controle costuma ser feito de forma manual ou fragmentada (planilhas, registros
físicos), o que gera risco de descumprimento de prazos, perda de documentação e dificuldade em
apontar responsáveis.

Este projeto propõe um sistema automatizado capaz de:
* Monitorar o estado de manutenção de veículos e ferramentas;
* Controlar prazos, responsáveis e histórico de intervenções;
* Identificar equipamentos com manutenção vencida, próxima do vencimento ou com pendências;
* Permitir que o responsável tire uma foto do veículo/ferramenta no momento da conferência, para
  que uma Inteligência Artificial analise a imagem e faça uma checagem automática das condições
  do equipamento, apontando possíveis avarias, desgastes ou irregularidades visuais;
* Gerar relatórios periódicos em PDF, consolidando o status de cada ativo (incluindo o resultado
  da checagem por foto);
* Enviar automaticamente esses relatórios por e-mail aos responsáveis, com periodicidade
  definida (diária, semanal ou mensal), garantindo rastreabilidade e conformidade contínua com
  as exigências regulatórias.

### Funcionalidades Previstas
* CRUD de veículos e ferramentas;
* CRUD de peças e insumos vinculados a cada equipamento;
* Controle de datas de manutenção (última, próxima, vencida);
* Alertas automáticos de vencimento;
* Captura de foto do veículo/ferramenta via aplicativo/painel para conferência;
* Checagem automática das condições do equipamento por Inteligência Artificial (análise de
  imagem, identificando avarias, desgastes ou irregularidades visuais);
* Geração de relatórios em PDF, incluindo o resultado da checagem por IA;
* Envio automático de relatórios por e-mail;
* Painel de status geral da frota/ferramentas.

## Tecnologias e Ferramentas Utilizadas
* **TypeScript** — linguagem principal do projeto;
* **React** — front-end, painel de gestão dos ativos;
* **NestJS** — back-end e regras de negócio;
* **PostgreSQL** — banco de dados relacional para cadastro de ativos, peças e histórico;
* **Biblioteca de geração de PDF** *(ex: Puppeteer, PDFKit ou similar — definir a escolhida)*;
* **Serviço de envio de e-mail** *(ex: Nodemailer + SMTP, SendGrid ou similar — definir o escolhido)*;
* **Serviço de IA para análise de imagem** *(ex: API de visão computacional para checagem
  automática das fotos de veículos e ferramentas — definir o serviço/modelo escolhido)*.

## Instruções de Instalação, Dependências e Execução

> Ajuste os comandos abaixo conforme a estrutura final do repositório (ex: se front-end e
> back-end estiverem em pastas separadas `/frontend` e `/backend`).

### Pré-requisitos
* [Node.js](https://nodejs.org/) (versão 18 ou superior recomendada)
* [PostgreSQL](https://www.postgresql.org/) instalado e em execução
* npm ou yarn

### Clonando o repositório
```bash
git clone <URL_DO_REPOSITORIO>
cd <NOME_DO_REPOSITORIO>
```

### Configuração do Back-end (NestJS)
```bash
cd backend
npm install
```

Crie um arquivo `.env` na raiz do back-end com as variáveis de ambiente necessárias, por exemplo:
```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/nome_do_banco
EMAIL_SERVICE_API_KEY=sua_chave_aqui
```

Execute as migrações do banco de dados (se aplicável):
```bash
npm run migration:run
```

Inicie o servidor back-end:
```bash
npm run start:dev
```

### Configuração do Front-end (React)
```bash
cd frontend
npm install
npm run dev
```

### Status Atual do Projeto
Este projeto encontra-se em fase de planejamento e definição de requisitos. As próximas etapas
incluem a modelagem do banco de dados, implementação do CRUD de ativos e da lógica de
monitoramento de prazos de manutenção.

## Fluxograma do Sistema
*(inserir imagem ou link do fluxograma do sistema aqui)*