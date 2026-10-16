# Entrega — Evolução do código (Truck Check)

Este arquivo reúne os itens pedidos pelo professor, para que qualquer integrante do grupo possa realizar a entrega.

## 1. Código atualizado

Repositório: <https://github.com/Gustavovieira29/truck_check> (branch `main`).

Para executar, siga o passo a passo do [README](./README.md#clonar-e-executar-localmente).

## 2. Commits realizados no GitHub

Histórico completo: <https://github.com/Gustavovieira29/truck_check/commits/main>

| Commit | Descrição |
| ------ | --------- |
| [`c7bfd6a`](https://github.com/Gustavovieira29/truck_check/commit/c7bfd6a0de67548c961e78a9bf0d317f1d6c9bbd) | Ajustes no frontend: URL da API centralizada em `src/config.ts` e correção da ordem dos hooks do React em `src/App.tsx`. |
| [`eea7681`](https://github.com/Gustavovieira29/truck_check/commit/eea7681b5bdcfa7ef403eac2ef94588f35af8bcf) | Relatório de evolução com explicação da correção e roteiro de demonstração. |
| [`6b27fa4`](https://github.com/Gustavovieira29/truck_check/commit/6b27fa4ff65da4f0af374f052d8b6f0b5f067230) | Facilita clonar e executar: `.env.example` com SQLite, README revisado, versão mínima do Node e remoção de banco/caches do Git. |

## 3. Descrição das alterações realizadas

- **Correção do login:** após entrar com credenciais válidas, o painel podia falhar com o erro "Rendered more hooks than during the previous render". O `useEffect` do componente `App` foi movido para antes do `return` condicional que exibe a tela de login, mantendo a ordem dos hooks estável.
- **URL da API configurável:** o frontend passou a montar as chamadas por `apiUrl()` em `src/config.ts`, com suporte à variável `VITE_API_BASE_URL`.
- **Clonagem mais simples:** inclusão de `backend/.env.example` com SQLite e credenciais locais de demonstração, instruções para Windows, macOS e Linux, e exigência correta de Node.js 20.19+ ou 22.12+.
- **Repositório mais limpo:** banco `truck_check.db`, caches Python, `.venv` e uploads passaram a ser ignorados pelo Git.
- **Documentação:** relatório de evolução em [RELATORIO_EVOLUCAO_PROJETO.md](./RELATORIO_EVOLUCAO_PROJETO.md).

## 4. Explicação dos principais trechos

- **`src/App.tsx` — `App`:** guarda o token no estado e no `localStorage`, registra o `useEffect` do evento `hashchange` e, só depois, decide entre exibir `Login` ou o painel. Hooks sempre antes de qualquer `return` condicional.
- **`src/App.tsx` — `Login`:** envia e-mail e senha por `POST /api/auth/login` e, se a resposta for válida, libera o painel; senão, mostra a mensagem de erro.
- **`src/config.ts`:** define `API_BASE_URL` e a função `apiUrl()` usada pelos componentes para chamar a API.
- **`backend/app/routes/auth.py`:** compara e-mail e senha com `ADMIN_EMAIL` e `ADMIN_PASSWORD` do `backend/.env` e devolve um token.
- **`backend/app/config.py`:** lê as configurações do `backend/.env` (banco, CORS, SMTP, login, Gemini).

## 5. Roteiro para o vídeo (opcional, 2 a 3 minutos)

1. Mostrar o repositório no GitHub e os commits listados acima.
2. Rodar o projeto seguindo o README (API em um terminal, painel em outro).
3. Fazer login na tela inicial e mostrar o Dashboard carregando.
4. No editor, mostrar em `src/App.tsx` o `useEffect` antes da condição do login e explicar a correção.
5. Navegar rapidamente por Ativos, Manutenções, Inspeção por Foto e Relatórios.

Não mostre senhas pessoais, tokens ou arquivos `.env` reais no vídeo.
