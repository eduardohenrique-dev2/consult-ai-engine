export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_learning: {
        Row: {
          chamado_id: string | null
          corrigido_por: string | null
          created_at: string
          id: string
          resposta_corrigida: string | null
          resposta_original: string | null
        }
        Insert: {
          chamado_id?: string | null
          corrigido_por?: string | null
          created_at?: string
          id?: string
          resposta_corrigida?: string | null
          resposta_original?: string | null
        }
        Update: {
          chamado_id?: string | null
          corrigido_por?: string | null
          created_at?: string
          id?: string
          resposta_corrigida?: string | null
          resposta_original?: string | null
        }
        Relationships: []
      }
      automacoes: {
        Row: {
          ativo: boolean
          created_at: string
          fluxo: Json
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          fluxo?: Json
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          fluxo?: Json
          id?: string
          nome?: string
        }
        Relationships: []
      }
      base_conhecimento: {
        Row: {
          categoria: string
          conteudo: string
          created_at: string
          id: string
          tipo: string
          titulo: string
        }
        Insert: {
          categoria?: string
          conteudo: string
          created_at?: string
          id?: string
          tipo: string
          titulo: string
        }
        Update: {
          categoria?: string
          conteudo?: string
          created_at?: string
          id?: string
          tipo?: string
          titulo?: string
        }
        Relationships: []
      }
      chamado_anexos: {
        Row: {
          chamado_id: string
          created_at: string
          id: string
          nome_arquivo: string
          origem: string
          storage_path: string | null
          tamanho_bytes: number | null
          texto_extraido: string | null
          tipo: string
          url: string
        }
        Insert: {
          chamado_id: string
          created_at?: string
          id?: string
          nome_arquivo: string
          origem?: string
          storage_path?: string | null
          tamanho_bytes?: number | null
          texto_extraido?: string | null
          tipo?: string
          url: string
        }
        Update: {
          chamado_id?: string
          created_at?: string
          id?: string
          nome_arquivo?: string
          origem?: string
          storage_path?: string | null
          tamanho_bytes?: number | null
          texto_extraido?: string | null
          tipo?: string
          url?: string
        }
        Relationships: []
      }
      chamado_interactions: {
        Row: {
          chamado_id: string
          created_at: string
          id: string
          pergunta: string
          resposta: string
        }
        Insert: {
          chamado_id: string
          created_at?: string
          id?: string
          pergunta: string
          resposta: string
        }
        Update: {
          chamado_id?: string
          created_at?: string
          id?: string
          pergunta?: string
          resposta?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamado_interactions_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
        ]
      }
      chamados: {
        Row: {
          categoria: string | null
          cliente_id: string | null
          confianca_ia: number | null
          created_at: string
          descricao: string | null
          eh_esocial: boolean
          evento_esocial: string | null
          id: string
          integration_id: string | null
          motivo_bloqueio_auto: string | null
          nivel_risco: string | null
          observacoes: string | null
          owner_user_id: string | null
          prioridade: string
          query_sugerida: string | null
          responsavel_id: string | null
          resposta_enviada: boolean
          setor: string | null
          status: string
          sugestao_ia: string | null
          thread_id: string | null
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          cliente_id?: string | null
          confianca_ia?: number | null
          created_at?: string
          descricao?: string | null
          eh_esocial?: boolean
          evento_esocial?: string | null
          id?: string
          integration_id?: string | null
          motivo_bloqueio_auto?: string | null
          nivel_risco?: string | null
          observacoes?: string | null
          owner_user_id?: string | null
          prioridade?: string
          query_sugerida?: string | null
          responsavel_id?: string | null
          resposta_enviada?: boolean
          setor?: string | null
          status?: string
          sugestao_ia?: string | null
          thread_id?: string | null
          tipo: string
          titulo: string
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          cliente_id?: string | null
          confianca_ia?: number | null
          created_at?: string
          descricao?: string | null
          eh_esocial?: boolean
          evento_esocial?: string | null
          id?: string
          integration_id?: string | null
          motivo_bloqueio_auto?: string | null
          nivel_risco?: string | null
          observacoes?: string | null
          owner_user_id?: string | null
          prioridade?: string
          query_sugerida?: string | null
          responsavel_id?: string | null
          resposta_enviada?: boolean
          setor?: string | null
          status?: string
          sugestao_ia?: string | null
          thread_id?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamados_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "user_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      chamados_logs: {
        Row: {
          alterado_por: string | null
          chamado_id: string
          created_at: string
          id: string
          status: string
        }
        Insert: {
          alterado_por?: string | null
          chamado_id: string
          created_at?: string
          id?: string
          status: string
        }
        Update: {
          alterado_por?: string | null
          chamado_id?: string
          created_at?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamados_logs_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          cnpj: string | null
          contato: string | null
          created_at: string
          id: string
          nome: string
          problemas: string[] | null
          status: string
        }
        Insert: {
          cnpj?: string | null
          contato?: string | null
          created_at?: string
          id?: string
          nome: string
          problemas?: string[] | null
          status?: string
        }
        Update: {
          cnpj?: string | null
          contato?: string | null
          created_at?: string
          id?: string
          nome?: string
          problemas?: string[] | null
          status?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          page_context: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_context?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          page_context?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_import_log_itens: {
        Row: {
          anexos_processados: number
          assunto: string | null
          chamado_id: string | null
          created_at: string
          email_id: string
          id: string
          log_id: string
          mensagem_erro: string | null
          remetente: string | null
          status: string
        }
        Insert: {
          anexos_processados?: number
          assunto?: string | null
          chamado_id?: string | null
          created_at?: string
          email_id: string
          id?: string
          log_id: string
          mensagem_erro?: string | null
          remetente?: string | null
          status: string
        }
        Update: {
          anexos_processados?: number
          assunto?: string | null
          chamado_id?: string | null
          created_at?: string
          email_id?: string
          id?: string
          log_id?: string
          mensagem_erro?: string | null
          remetente?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_import_log_itens_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "email_import_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      email_import_logs: {
        Row: {
          classificacao_padrao: string | null
          created_at: string
          data_importacao: string
          id: string
          status: string
          total_duplicados: number
          total_erros: number
          total_importados: number
          total_processados: number
          usuario_id: string | null
        }
        Insert: {
          classificacao_padrao?: string | null
          created_at?: string
          data_importacao?: string
          id?: string
          status?: string
          total_duplicados?: number
          total_erros?: number
          total_importados?: number
          total_processados?: number
          usuario_id?: string | null
        }
        Update: {
          classificacao_padrao?: string | null
          created_at?: string
          data_importacao?: string
          id?: string
          status?: string
          total_duplicados?: number
          total_erros?: number
          total_importados?: number
          total_processados?: number
          usuario_id?: string | null
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          assunto: string | null
          chamado_id: string | null
          conteudo: string | null
          created_at: string
          destinatario: string | null
          direction: string
          erro: string | null
          id: string
          status: string
        }
        Insert: {
          assunto?: string | null
          chamado_id?: string | null
          conteudo?: string | null
          created_at?: string
          destinatario?: string | null
          direction: string
          erro?: string | null
          id?: string
          status: string
        }
        Update: {
          assunto?: string | null
          chamado_id?: string | null
          conteudo?: string | null
          created_at?: string
          destinatario?: string | null
          direction?: string
          erro?: string | null
          id?: string
          status?: string
        }
        Relationships: []
      }
      imported_emails: {
        Row: {
          assunto: string | null
          chamado_id: string | null
          data_email: string | null
          gmail_message_id: string
          id: string
          imported_at: string
          integration_id: string | null
          owner_user_id: string | null
          processed_status: string
          remetente: string | null
          thread_id: string | null
        }
        Insert: {
          assunto?: string | null
          chamado_id?: string | null
          data_email?: string | null
          gmail_message_id: string
          id?: string
          imported_at?: string
          integration_id?: string | null
          owner_user_id?: string | null
          processed_status?: string
          remetente?: string | null
          thread_id?: string | null
        }
        Update: {
          assunto?: string | null
          chamado_id?: string | null
          data_email?: string | null
          gmail_message_id?: string
          id?: string
          imported_at?: string
          integration_id?: string | null
          owner_user_id?: string | null
          processed_status?: string
          remetente?: string | null
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imported_emails_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_emails_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "user_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          chamado_id: string | null
          created_at: string
          id: string
          lida: boolean
          mensagem: string
          tipo: string
          titulo: string
        }
        Insert: {
          chamado_id?: string | null
          created_at?: string
          id?: string
          lida?: boolean
          mensagem: string
          tipo?: string
          titulo: string
        }
        Update: {
          chamado_id?: string | null
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          assinatura: string | null
          avatar_url: string | null
          cargo: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          setor: string | null
          user_id: string
        }
        Insert: {
          assinatura?: string | null
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          setor?: string | null
          user_id: string
        }
        Update: {
          assinatura?: string | null
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          setor?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reunioes: {
        Row: {
          chamado_id: string | null
          cliente_id: string | null
          cor: string
          created_at: string
          data_fim: string
          data_inicio: string
          descricao: string | null
          id: string
          notas: string | null
          participantes: string[] | null
          pauta_ia: string | null
          proximos_passos_ia: string | null
          resumo_ia: string | null
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          chamado_id?: string | null
          cliente_id?: string | null
          cor?: string
          created_at?: string
          data_fim: string
          data_inicio: string
          descricao?: string | null
          id?: string
          notas?: string | null
          participantes?: string[] | null
          pauta_ia?: string | null
          proximos_passos_ia?: string | null
          resumo_ia?: string | null
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          chamado_id?: string | null
          cliente_id?: string | null
          cor?: string
          created_at?: string
          data_fim?: string
          data_inicio?: string
          descricao?: string | null
          id?: string
          notas?: string | null
          participantes?: string[] | null
          pauta_ia?: string | null
          proximos_passos_ia?: string | null
          resumo_ia?: string | null
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reunioes_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reunioes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          auto_reply_enabled: boolean
          bloquear_rescisoes: boolean
          bloquear_valores_altos: boolean
          categorias_permitidas_auto: string[]
          check_interval_minutes: number
          confidence_threshold: number
          id: string
          signature: string | null
          updated_at: string
          valor_limite: number
        }
        Insert: {
          auto_reply_enabled?: boolean
          bloquear_rescisoes?: boolean
          bloquear_valores_altos?: boolean
          categorias_permitidas_auto?: string[]
          check_interval_minutes?: number
          confidence_threshold?: number
          id?: string
          signature?: string | null
          updated_at?: string
          valor_limite?: number
        }
        Update: {
          auto_reply_enabled?: boolean
          bloquear_rescisoes?: boolean
          bloquear_valores_altos?: boolean
          categorias_permitidas_auto?: string[]
          check_interval_minutes?: number
          confidence_threshold?: number
          id?: string
          signature?: string | null
          updated_at?: string
          valor_limite?: number
        }
        Relationships: []
      }
      user_integrations: {
        Row: {
          created_at: string
          display_name: string | null
          email_address: string
          id: string
          imap_host: string | null
          imap_password_encrypted: string | null
          imap_port: number | null
          imap_user: string | null
          last_error: string | null
          last_sync_at: string | null
          oauth_access_token: string | null
          oauth_expires_at: string | null
          oauth_refresh_token: string | null
          oauth_scope: string | null
          provider: string
          smtp_host: string | null
          smtp_password_encrypted: string | null
          smtp_port: number | null
          smtp_user: string | null
          status: string
          sync_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email_address: string
          id?: string
          imap_host?: string | null
          imap_password_encrypted?: string | null
          imap_port?: number | null
          imap_user?: string | null
          last_error?: string | null
          last_sync_at?: string | null
          oauth_access_token?: string | null
          oauth_expires_at?: string | null
          oauth_refresh_token?: string | null
          oauth_scope?: string | null
          provider: string
          smtp_host?: string | null
          smtp_password_encrypted?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          status?: string
          sync_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email_address?: string
          id?: string
          imap_host?: string | null
          imap_password_encrypted?: string | null
          imap_port?: number | null
          imap_user?: string | null
          last_error?: string | null
          last_sync_at?: string | null
          oauth_access_token?: string | null
          oauth_expires_at?: string | null
          oauth_refresh_token?: string | null
          oauth_scope?: string | null
          provider?: string
          smtp_host?: string | null
          smtp_password_encrypted?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          status?: string
          sync_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          assinatura: string | null
          auto_reply_enabled: boolean
          confidence_threshold: number
          created_at: string
          id: string
          notificacoes_email: boolean
          notificacoes_push: boolean
          tema: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assinatura?: string | null
          auto_reply_enabled?: boolean
          confidence_threshold?: number
          created_at?: string
          id?: string
          notificacoes_email?: boolean
          notificacoes_push?: boolean
          tema?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assinatura?: string | null
          auto_reply_enabled?: boolean
          confidence_threshold?: number
          created_at?: string
          id?: string
          notificacoes_email?: boolean
          notificacoes_push?: boolean
          tema?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_setor: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "consultor" | "supervisor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "consultor", "supervisor"],
    },
  },
} as const
