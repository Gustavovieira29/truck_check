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

## Clonar e executar localmente

### Pré-requisitos

- [Git](https://git-scm.com/);
- [Node.js](https://nodejs.org/) 20.19 ou superior (ou 22.12 ou superior) e npm;
- Python 3.12.

Docker Desktop é opcional e só é necessário para testar a caixa de e-mail local Mailpit.

### Windows (PowerShell)

Clone o repositório e entre na pasta:

```powershell
git clone https://github.com/Gustavovieira29/truck_check.git
cd truck_check
```

Crie o arquivo local de configuração, o ambiente virtual Python e instale as dependências:

```powershell
Copy-Item backend\.env.example backend\.env
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
npm install
```

Abra **dois terminais** na pasta `truck_check`. No primeiro, inicie a API:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

No segundo, inicie o painel:

```powershell
npm run dev
```

Abra o endereço indicado pelo Vite (normalmente <http://localhost:5173/>). A documentação da API fica em <http://localhost:8000/docs>.

O arquivo de exemplo configura SQLite local e credenciais apenas para demonstração:

- **E-mail:** `admin@truckcheck.local`
- **Senha:** `truckcheck-local-only`

Essas credenciais são públicas e servem somente para desenvolvimento local. Altere `ADMIN_PASSWORD` em `backend/.env` antes de expor o projeto a outras pessoas ou à internet. O arquivo `.env` é local e não deve ser enviado ao Git.

### Publicar no Render (demonstração gratuita)

O arquivo [`render.yaml`](./render.yaml) configura o painel, a API e um banco PostgreSQL no Render:

1. Envie este projeto para um repositório GitHub.
2. No Render, crie um **Blueprint** e conecte o repositório.
3. Na primeira configuração, informe `ADMIN_EMAIL` e defina uma senha forte em `ADMIN_PASSWORD`. O Render gera `AUTH_TOKEN_SECRET` automaticamente.
4. Confirme a criação dos serviços e aguarde a publicação. Use a URL pública de `truck-check-web` para acessar o sistema de qualquer lugar.

O login é uma conta compartilhada definida pelas variáveis do backend. A API exige o token emitido após o login. Use uma senha diferente das credenciais locais e não publique segredos no Git.

**Limitações do plano gratuito:** os serviços podem hibernar quando não usados, o PostgreSQL gratuito expira após 30 dias e arquivos de fotos ficam em armazenamento temporário. Use apenas para demonstração; para operação contínua, contrate armazenamento persistente e faça backup dos dados.

### macOS e Linux

Use os mesmos comandos de clone. Para preparar o ambiente, execute:

```bash
cp backend/.env.example backend/.env
python3.12 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
npm install
```

Em dois terminais na pasta do projeto, inicie os serviços (use `python` se seu comando para Python 3.12 tiver esse nome):

```bash
.venv/bin/python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

```bash
npm run dev
```

### E-mail de demonstração (opcional)

Para capturar e consultar mensagens localmente, inicie o Mailpit com Docker:

```bash
docker compose up -d mailpit
```

Consulte a caixa de entrada em <http://localhost:8025>. Sem Mailpit, Gemini ou credenciais SMTP, a análise de imagem usa o modo demonstrativo e o envio de e-mail externo não fica ativo.

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
