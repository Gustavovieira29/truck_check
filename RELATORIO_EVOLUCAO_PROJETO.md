# Relatório de evolução do projeto — Truck Check

**Data:** 06/10/2026
**Etapa:** evolução do protótipo funcional
**Equipe:** preencher com os nomes dos integrantes

## 1. Situação atual

O Truck Check é uma aplicação web para gestão de ativos de frota. O frontend foi desenvolvido em React com Vite e o backend em Python com FastAPI. A API utiliza SQLAlchemy para acessar um banco relacional: SQLite para execução local e suporte configurável a PostgreSQL. O projeto está funcional como protótipo local; integrações que precisam de credenciais externas ainda dependem de configuração e validação.

## 2. Funcionalidades desenvolvidas

- **Dashboard:** indicadores de ativos e manutenções, saúde da frota, alertas e próximas manutenções.
- **Pesquisa e filtros:** a tela de ativos permite pesquisar por nome, código e responsável e filtrar por tipo e situação; o Dashboard também ganhou pesquisa por ativo, código, responsável ou local.
- **Topo fixo:** a barra superior permanece visível enquanto o conteúdo da página rola.
- **Ativos:** consulta e operações de cadastro, edição e exclusão.
- **Manutenções:** consulta e gerenciamento de registros vinculados aos ativos, com status e datas.
- **Peças e insumos:** consulta e gerenciamento do estoque.
- **Inspeção por foto:** validação de imagens, registro da inspeção e geração de relatório PDF. O backend salva as imagens localmente em `backend/uploads`.
- **Análise de imagem:** existe endpoint preparado para chamar o Gemini quando `GEMINI_API_KEY` estiver configurada. Sem a chave, retorna uma análise demonstrativa; o modo demonstrativo foi testado.
- **Relatórios e e-mail:** geração de relatórios e implementação opcional de envio pela Gmail API com OAuth2. SMTP local continua disponível como alternativa.
- **Login demonstrativo:** existe uma tela de login conectada ao endpoint da API; credenciais podem ser configuradas por variáveis de ambiente.

## 3. Funcionalidades pendentes

- Configurar e testar uma chave válida do Gemini para confirmar análise real de fotos.
- Configurar credenciais OAuth2 do Google e testar entrega real de e-mails. Até então, o envio pela Gmail API não está validado com uma conta real.
- Migrar as fotos do armazenamento local para um serviço persistente/de objetos se o sistema for publicado ou utilizado por mais de uma máquina.
- Tornar a autenticação adequada para produção: substituir o token demonstrativo por sessão/JWT assinado e expirável, armazenar senha com hash e exigir autenticação nas rotas de dados.
- Adicionar testes automatizados para login, filtros, upload, análise e envio de e-mails.
- Adotar migrações de banco (por exemplo, Alembic) antes de mudanças futuras no esquema.
- Atualizar o GitHub com o relatório e a versão revisada do projeto.

## 4. Principais problemas encontrados e soluções

- **Bloqueio de CORS:** a API não permitia a origem do frontend na porta `8443`. A origem foi incluída na configuração do backend.
- **Dependências Python ausentes no ambiente virtual:** `uvicorn` e `fastapi` não estavam disponíveis no ambiente usado para iniciar a API; foram instalados para permitir a execução local.
- **Erro ao salvar imagem:** o diretório usado para salvar o upload não correspondia ao diretório servido pela aplicação. O caminho foi corrigido e o endpoint foi testado com resposta HTTP 200 em modo demonstrativo.
- **Credenciais externas não configuradas:** Gemini e Gmail precisam de chaves/tokens em variáveis de ambiente; sem elas não é possível testar chamadas reais aos provedores.

## 5. Próxima etapa de desenvolvimento

1. Configurar as credenciais do Gemini e do Google em arquivo local de ambiente, sem incluí-las no repositório.
2. Executar testes com imagens reais e mensagens de teste, verificando erros, limites e respostas dos provedores.
3. Fortalecer autenticação e autorização antes de disponibilizar o sistema fora do ambiente local.
4. Definir armazenamento persistente das fotos e adicionar testes automatizados.
5. Revisar as alterações, atualizar o repositório GitHub e registrar a entrega.

## 6. Divisão de tarefas sugerida

> Substituir “Integrante” pelos nomes reais da equipe antes de entregar.

| Responsável  | Tarefa                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------- |
| Integrante 1 | Frontend: Dashboard, pesquisa, filtros e ajustes de interface.                                 |
| Integrante 2 | Backend e banco: API, modelos, validação e testes das rotas.                                   |
| Integrante 3 | Inspeções: upload/armazenamento de fotos e validação da análise Gemini.                        |
| Integrante 4 | Relatórios e qualidade: integração Gmail, testes finais, documentação e atualização do GitHub. |

## 7. Testes realizados

- Build de produção do frontend executado com sucesso (`npm run build`).
- Compilação dos módulos do backend executada com sucesso.
- API de saúde e login demonstrativo responderam corretamente.
- Endpoint de análise de imagem retornou resposta HTTP 200 em modo demonstrativo e salvou o arquivo de teste localmente.

## 8. Texto curto para apresentação

> Nesta etapa, evoluímos o Truck Check, um protótipo para gestão de ativos e manutenção de frota. A aplicação já apresenta dashboard com indicadores, cadastro de ativos, controle de manutenções e peças, inspeções por foto e relatórios. Também adicionamos pesquisa no dashboard, topo fixo, uma tela de login demonstrativa e um fluxo de upload que salva imagens localmente. A integração com Gemini e Gmail está preparada, mas depende da configuração de credenciais externas; por isso, a análise de imagem ainda pode operar em modo demonstrativo. Os próximos passos são validar essas integrações com contas reais, fortalecer a autenticação, adicionar testes e atualizar o GitHub.

## Atualização sugerida para o GitHub

**Título/commit:** `docs: adicionar relatório de evolução do Truck Check`

**Descrição:** Registra o estado atual do projeto, funcionalidades implementadas, pendências, problemas encontrados, próximos passos e proposta de divisão de tarefas.
