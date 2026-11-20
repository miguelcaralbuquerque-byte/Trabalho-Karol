# Configuração do estoque

1. Crie um projeto no [Supabase](https://supabase.com/).
2. No **SQL Editor**, execute o conteúdo de `schema.sql`.
3. Crie o usuário da loja em **Authentication → Users** e copie o UUID dele.
4. No SQL Editor, conceda acesso administrativo a esse usuário:

   ```sql
   insert into public.user_roles (user_id, role)
   values ('UUID_DO_USUARIO', 'admin')
   on conflict (user_id) do update set role = excluded.role;
   ```

5. Copie a URL do projeto e a chave **publishable/anon** em **Project Settings → API** para `supabase-config.js`. Não use nem publique a chave `service_role`.
6. Publique o site em um host estático. O painel **Gestão de estoque**, no rodapé, permite cadastrar variações e salvar quantidades diretamente no Supabase, sem alterar ou publicar o código.

O catálogo inicial contém produtos demonstrativos. Cadastre no painel cada combinação de tamanho e cor com a quantidade real. Um pedido enviado pelo WhatsApp fica pendente; somente **Confirmar venda e baixar estoque** registra a venda e desconta as unidades. A confirmação de pagamento continua sendo manual, pois o site não processa pagamentos.
