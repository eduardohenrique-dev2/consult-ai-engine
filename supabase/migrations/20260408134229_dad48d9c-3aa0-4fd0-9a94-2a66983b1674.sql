
-- Fix notifications: drop public policies, keep only authenticated
DROP POLICY IF EXISTS "Anyone can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can update notifications" ON public.notifications;

-- Fix conversations: drop public policies, add authenticated
DROP POLICY IF EXISTS "Anyone can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Anyone can insert conversations" ON public.conversations;
DROP POLICY IF EXISTS "Anyone can update conversations" ON public.conversations;
DROP POLICY IF EXISTS "Anyone can delete conversations" ON public.conversations;

CREATE POLICY "Authenticated can view conversations" ON public.conversations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update conversations" ON public.conversations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete conversations" ON public.conversations FOR DELETE TO authenticated USING (true);

-- Fix chat_messages: drop public policies, add authenticated
DROP POLICY IF EXISTS "Anyone can view messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone can insert messages" ON public.chat_messages;

CREATE POLICY "Authenticated can view messages" ON public.chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (true);
