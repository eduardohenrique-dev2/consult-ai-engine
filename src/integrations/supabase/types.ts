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
          observacoes: string | null
          prioridade: string
          query_sugerida: string | null
          responsavel_id: string | null
          resposta_enviada: boolean
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
          observacoes?: string | null
          prioridade?: string
          query_sugerida?: string | null
          responsavel_id?: string | null
          resposta_enviada?: boolean
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
          observacoes?: string | null
          prioridade?: string
          query_sugerida?: string | null
          responsavel_id?: string | null
          resposta_enviada?: boolean
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
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
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
          check_interval_minutes: number
          confidence_threshold: number
          id: string
          signature: string | null
          updated_at: string
        }
        Insert: {
          auto_reply_enabled?: boolean
          check_interval_minutes?: number
          confidence_threshold?: number
          id?: string
          signature?: string | null
          updated_at?: string
        }
        Update: {
          auto_reply_enabled?: boolean
          check_interval_minutes?: number
          confidence_threshold?: number
          id?: string
          signature?: string | null
          updated_at?: string
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
    }
    Enums: {
      app_role: "admin" | "consultor"
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
      app_role: ["admin", "consultor"],
    },
  },
} as const
