# Sistema de Automação de Manutenção de Frotas e Ferramentas

## Integrantes do Grupo

- Gustavo Vieira
- Yasmin Vier Scotti
- Alessandro Zientara
- Abel Felipe
- Pedro Neto

## Resumo da Automação Proposta

Empresas com frotas de veículos e ferramentas de uso operacional constante precisam garantir
que esses ativos estejam sempre em condições seguras de uso, cumprindo manutenções preventivas
e corretivas dentro dos prazos legais exigidos por órgãos fiscalizadores (DOT, INMETRO,
Vigilância Sanitária, entre outros, dependendo do setor).

Atualmente esse controle costuma ser feito de forma manual ou fragmentada (planilhas, registros
físicos), o que gera risco de descumprimento de prazos, perda de documentação e dificuldade em
apontar responsáveis.

Este projeto propõe um sistema automatizado capaz de:

- Monitorar o estado de manutenção de veículos e ferramentas;
- Controlar prazos, responsáveis e histórico de intervenções;
- Identificar equipamentos com manutenção vencida, próxima do vencimento ou com pendências;
- Permitir que o responsável tire uma foto do veículo/ferramenta no momento da conferência, para
  que uma Inteligência Artificial analise a imagem e faça uma checagem automática das condições
  do equipamento, apontando possíveis avarias, desgastes ou irregularidades visuais;
- Gerar relatórios periódicos em PDF, consolidando o status de cada ativo (incluindo o resultado
  da checagem por foto);
- Enviar automaticamente esses relatórios por e-mail aos responsáveis, com periodicidade
  definida (diária, semanal ou mensal), garantindo rastreabilidade e conformidade contínua com
  as exigências regulatórias.

### Funcionalidades Previstas

- CRUD de veículos e ferramentas;
- CRUD de peças e insumos vinculados a cada equipamento;
- Controle de datas de manutenção (última, próxima, vencida);
- Alertas automáticos de vencimento;
- Captura de foto do veículo/ferramenta via aplicativo/painel para conferência;
- Checagem automática das condições do equipamento por Inteligência Artificial (análise de
  imagem, identificando avarias, desgastes ou irregularidades visuais);
- Geração de relatórios em PDF, incluindo o resultado da checagem por IA;
- Envio automático de relatórios por e-mail;
- Painel de status geral da frota/ferramentas.

## Tecnologias e Ferramentas Utilizadas

- **TypeScript e React** — painel de gestão dos ativos;
- **Python e FastAPI** — back-end e regras de negócio;
- **SQLite e SQLAlchemy** — banco de dados local para ativos, manutenções, inspeções e relatórios;
- **jsPDF** — geração de relatórios PDF para download;
- **SMTP** — serviço de envio de e-mail, configurável por variáveis de ambiente;
- **Mailpit** — caixa de e-mail local para demonstração sem credenciais externas.

## Instruções de Instalação, Dependências e Execução

> Ajuste os comandos abaixo conforme a estrutura final do repositório (ex: se front-end e
> back-end estiverem em pastas separadas `/frontend` e `/backend`).

### Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou superior;
- Python 3.12;
- npm;
- Docker Desktop, somente para demonstrar e-mails no Mailpit.

### Clonando o repositório

```bash
git clone <URL_DO_REPOSITORIO>
cd <NOME_DO_REPOSITORIO>
```

### Configuração do Back-end (FastAPI)

```bash
py -3.12 -m pip install -r backend/requirements.txt
npm run dev:backend
```

O banco `truck_check.db` é criado automaticamente na raiz do projeto e recebe dados iniciais
na primeira inicialização. A API fica disponível em `http://localhost:8000` e a documentação
interativa fica em `http://localhost:8000/docs`.

Para e-mail externo, crie `backend/.env` a partir de `backend/.env.example` e informe os dados
do seu servidor SMTP:

```env
SMTP_HOST=smtp.seu-provedor.com
SMTP_PORT=587
SMTP_USERNAME=seu_usuario
SMTP_PASSWORD=sua_senha_de_aplicativo
SMTP_FROM=seu_email@empresa.com
SMTP_USE_TLS=true
```

Para a demonstração local de e-mail:

```bash
docker compose up -d mailpit
```

Os e-mails de teste podem ser consultados em `http://localhost:8025`.

### Configuração do Front-end (React)

```bash
npm install
npm run dev
```

O painel fica disponível em `http://localhost:5173`.

### Funcionalidades Implementadas

- Cadastro, edição, listagem e exclusão de veículos;
- Cadastro, edição, listagem e exclusão de manutenções;
- Registro persistido de inspeções por foto e resultado de análise;
- Dashboard com dados carregados da API e do banco local;
- Relatórios persistidos, geração de PDF e entrega por SMTP configurado;
- Validações de dados, mensagens de erro da API, máscaras de placa e valor, além de dicas de contexto;
- Preservação da página atual após atualizar o navegador.

### Limites de Ambiente

A análise de inspeção usa um resultado demonstrativo e determinístico. O envio de e-mail externo
depende de credenciais SMTP válidas; sem elas, o Mailpit permite demonstrar o fluxo localmente.

## Fluxograma do Sistema

_(inserir imagem ou link do fluxograma do sistema aqui)_
