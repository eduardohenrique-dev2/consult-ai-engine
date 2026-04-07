import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";

export interface Reuniao {
  id: string;
  titulo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string;
  cor: string;
  status: string;
  cliente_id: string | null;
  chamado_id: string | null;
  participantes: string[] | null;
  notas: string | null;
  resumo_ia: string | null;
  pauta_ia: string | null;
  proximos_passos_ia: string | null;
  created_at: string;
  updated_at: string;
  clientes?: { nome: string } | null;
  chamados?: { titulo: string } | null;
}

export type ReuniaoInsert = {
  titulo: string;
  descricao?: string | null;
  data_inicio: string;
  data_fim: string;
  cor?: string;
  status?: string;
  cliente_id?: string | null;
  chamado_id?: string | null;
  participantes?: string[];
  notas?: string | null;
};

export function useReunioes() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["reunioes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reunioes")
        .select("*, clientes(nome), chamados(titulo)")
        .order("data_inicio", { ascending: true });
      if (error) throw error;
      return data as Reuniao[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (reuniao: ReuniaoInsert) => {
      const { data, error } = await supabase.from("reunioes").insert(reuniao).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reunioes"] });
      toast.success("Reunião criada com sucesso");
    },
    onError: () => toast.error("Erro ao criar reunião"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Reuniao> & { id: string }) => {
      const { data, error } = await supabase.from("reunioes").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reunioes"] });
      toast.success("Reunião atualizada");
    },
    onError: () => toast.error("Erro ao atualizar reunião"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reunioes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reunioes"] });
      toast.success("Reunião excluída");
    },
    onError: () => toast.error("Erro ao excluir reunião"),
  });

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("reunioes-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "reunioes" }, () => {
        queryClient.invalidateQueries({ queryKey: ["reunioes"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return {
    reunioes: query.data || [],
    isLoading: query.isLoading,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
