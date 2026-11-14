# Пошаговая настройка (то, что делаешь руками)

## 0. Проверка инструментов (Урок 0)
В Терминале на Mac:
```bash
claude --version
gh --version        # нет? → brew install gh
supabase --version  # нет? → brew install supabase/tap/supabase
```
Сделай скриншот вывода — пригодится.

## 1. GitHub
1. github.com → **New repository** → имя `hw16-service`, Public или Private, **без** README.
2. Пришли ссылку в тред — код зальёт Claude. (Или сама: распакуй архив и выполни
   `git remote add origin <ссылка> && git push -u origin main`.)

## 2. Supabase
1. supabase.com → **New project** → имя `hw16`, регион **Central EU (Frankfurt)** или ближайший, придумай пароль базы и сохрани его.
2. **Project Settings → API**: скопируй *Project URL* и *anon public key*.
3. Создай таблицы миграцией (в папке проекта):
   ```bash
   supabase login
   supabase link --project-ref <ref>   # ref — это кусок из Project URL до .supabase.co
   supabase db push
   ```
   Если CLI не ставится: открой **SQL Editor**, вставь весь файл
   `supabase/migrations/20261114120000_init.sql` и нажми **Run** (миграция та же).
4. **Authentication → URL Configuration**:
   - Site URL: `https://<твой-проект>.vercel.app` (после шага 4)
   - Redirect URLs: добавь `https://<твой-проект>.vercel.app/auth/callback` и `http://localhost:3000/auth/callback`
5. **Authentication → Sign In / Providers → Email**: включено (по умолчанию да).

## 3. Вход через Google
1. console.cloud.google.com → создай проект `hw16`.
2. **APIs & Services → OAuth consent screen** → External → заполни название приложения и свою почту → Save.
   В **Audience/Test users** добавь свою почту (и почты тех, кто будет тестировать).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** → тип **Web application**.
   - Authorized redirect URIs: `https://<ref>.supabase.co/auth/v1/callback`
     (точный адрес показан в Supabase → Authentication → Providers → Google → Callback URL).
4. Скопируй **Client ID** и **Client Secret** → вставь в Supabase → **Authentication → Providers → Google** → Enable → Save.

«Google и почта в один аккаунт»: Supabase сам связывает вход через Google и вход по ссылке на
почту, если адрес почты одинаковый. Проверка: войди через Google, выйди, войди по ссылке на тот же
адрес — увидишь те же задания.

## 4. Vercel
1. vercel.com → войти через GitHub → **Add New → Project** → выбери `hw16-service` → Import.
2. **Environment Variables**: добавь
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon key
3. **Deploy**. Через минуту будет ссылка `https://….vercel.app` — это ссылка для сдачи.
4. Вернись в Supabase (шаг 2.4) и впиши эту ссылку.

## 5. Сделать себя админом
Войди на сайт один раз, потом Supabase → **SQL Editor**:
```sql
update public.profiles set role = 'admin' where email = 'твоя@почта';
```
Обнови страницу — появится ссылка «Админка». Проверка серверной роли: зайди с другого аккаунта
и открой `/admin` по прямой ссылке — тебя вернёт на список с сообщением «только для админа».

## 6. Скриншоты для PDF
1. Список заданий (`/assignments`) с 3–5 записями
2. Форма добавления (низ той же страницы) и форма редактирования
3. Страница входа с кнопкой Google + профиль после входа через Google
4. В Терминале: `claude` → команда `/mcp` → видно подключённый коннектор (например GitHub или Supabase)
5. (по желанию) Админка

## 7. Изменение с телефона через Remote Control
В Claude Code на Mac запусти `claude` в папке проекта и включи Remote Control (`/remote-control`),
открой сессию в приложении Claude на телефоне и попроси, например:
«поменяй текст на главной: "Все дедлайны в одном месте" → "Ни одного пропущенного дедлайна"», потом закоммить и запушь.
Vercel сам передеплоит сайт.
