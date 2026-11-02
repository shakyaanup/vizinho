export type Json =
  string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          details: NonNullable<Json>;
          id: number;
          target_id: string | null;
          target_table: string | null;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          details?: NonNullable<Json>;
          id?: never;
          target_id?: string | null;
          target_table?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          details?: NonNullable<Json>;
          id?: never;
          target_id?: string | null;
          target_table?: string | null;
        };
        Relationships: [];
      };
      custody_events: {
        Row: {
          actor_id: string | null;
          actor_role: Database["public"]["Enums"]["actor_role"];
          event_type: Database["public"]["Enums"]["custody_event_type"];
          id: number;
          metadata: NonNullable<Json>;
          occurred_at: string;
          parcel_id: string | null;
          reservation_id: string;
        };
        ComputedFields: never;
        Insert: {
          actor_id?: string | null;
          actor_role: Database["public"]["Enums"]["actor_role"];
          event_type: Database["public"]["Enums"]["custody_event_type"];
          id?: never;
          metadata?: NonNullable<Json>;
          occurred_at?: string;
          parcel_id?: string | null;
          reservation_id: string;
        };
        Update: {
          actor_id?: string | null;
          actor_role?: Database["public"]["Enums"]["actor_role"];
          event_type?: Database["public"]["Enums"]["custody_event_type"];
          id?: never;
          metadata?: NonNullable<Json>;
          occurred_at?: string;
          parcel_id?: string | null;
          reservation_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "custody_events_parcel_id_fkey";
            columns: ["parcel_id"];
            isOneToOne: false;
            referencedRelation: "parcels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "custody_events_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
        ];
      };
      host_private_details: {
        Row: {
          access_instructions: string | null;
          address_line1: string;
          address_line2: string | null;
          city: string;
          created_at: string;
          exact_location: unknown;
          host_id: string;
          postal_code: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          access_instructions?: string | null;
          address_line1: string;
          address_line2?: string | null;
          city: string;
          created_at?: string;
          exact_location: unknown;
          host_id: string;
          postal_code: string;
          updated_at?: string;
        };
        Update: {
          access_instructions?: string | null;
          address_line1?: string;
          address_line2?: string | null;
          city?: string;
          created_at?: string;
          exact_location?: unknown;
          host_id?: string;
          postal_code?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "host_private_details_host_id_fkey";
            columns: ["host_id"];
            isOneToOne: true;
            referencedRelation: "host_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      host_profiles: {
        Row: {
          area_label: string | null;
          business_name: string | null;
          created_at: string;
          display_name: string;
          host_type: Database["public"]["Enums"]["host_type"];
          id: string;
          is_paused: boolean;
          max_concurrent_parcels: number;
          max_declared_value_cents: number;
          max_parcel_size: Database["public"]["Enums"]["parcel_size"];
          public_location: unknown;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          rules_text: string | null;
          status: Database["public"]["Enums"]["host_status"];
          terms_accepted_at: string | null;
          terms_version: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          area_label?: string | null;
          business_name?: string | null;
          created_at?: string;
          display_name: string;
          host_type?: Database["public"]["Enums"]["host_type"];
          id?: string;
          is_paused?: boolean;
          max_concurrent_parcels?: number;
          max_declared_value_cents?: number;
          max_parcel_size?: Database["public"]["Enums"]["parcel_size"];
          public_location?: unknown;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          rules_text?: string | null;
          status?: Database["public"]["Enums"]["host_status"];
          terms_accepted_at?: string | null;
          terms_version?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          area_label?: string | null;
          business_name?: string | null;
          created_at?: string;
          display_name?: string;
          host_type?: Database["public"]["Enums"]["host_type"];
          id?: string;
          is_paused?: boolean;
          max_concurrent_parcels?: number;
          max_declared_value_cents?: number;
          max_parcel_size?: Database["public"]["Enums"]["parcel_size"];
          public_location?: unknown;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          rules_text?: string | null;
          status?: Database["public"]["Enums"]["host_status"];
          terms_accepted_at?: string | null;
          terms_version?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "host_profiles_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "host_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      host_time_off: {
        Row: {
          created_at: string;
          ends_at: string;
          host_id: string;
          id: string;
          reason: string | null;
          starts_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          ends_at: string;
          host_id: string;
          id?: string;
          reason?: string | null;
          starts_at: string;
        };
        Update: {
          created_at?: string;
          ends_at?: string;
          host_id?: string;
          id?: string;
          reason?: string | null;
          starts_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "host_time_off_host_id_fkey";
            columns: ["host_id"];
            isOneToOne: false;
            referencedRelation: "host_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      host_weekly_hours: {
        Row: {
          closes_at: string;
          created_at: string;
          host_id: string;
          id: string;
          opens_at: string;
          weekday: number;
        };
        ComputedFields: never;
        Insert: {
          closes_at: string;
          created_at?: string;
          host_id: string;
          id?: string;
          opens_at: string;
          weekday: number;
        };
        Update: {
          closes_at?: string;
          created_at?: string;
          host_id?: string;
          id?: string;
          opens_at?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "host_weekly_hours_host_id_fkey";
            columns: ["host_id"];
            isOneToOne: false;
            referencedRelation: "host_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      incident_attachments: {
        Row: {
          created_at: string;
          id: string;
          incident_id: string;
          storage_path: string;
          uploaded_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          incident_id: string;
          storage_path: string;
          uploaded_by?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          incident_id?: string;
          storage_path?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "incident_attachments_incident_id_fkey";
            columns: ["incident_id"];
            isOneToOne: false;
            referencedRelation: "incidents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incident_attachments_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      incidents: {
        Row: {
          assigned_to: string | null;
          created_at: string;
          description: string;
          host_id: string | null;
          id: string;
          parcel_id: string | null;
          reported_by: string;
          reservation_id: string | null;
          resolution: string | null;
          resolved_at: string | null;
          status: Database["public"]["Enums"]["incident_status"];
          type: Database["public"]["Enums"]["incident_type"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          assigned_to?: string | null;
          created_at?: string;
          description: string;
          host_id?: string | null;
          id?: string;
          parcel_id?: string | null;
          reported_by: string;
          reservation_id?: string | null;
          resolution?: string | null;
          resolved_at?: string | null;
          status?: Database["public"]["Enums"]["incident_status"];
          type: Database["public"]["Enums"]["incident_type"];
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          created_at?: string;
          description?: string;
          host_id?: string | null;
          id?: string;
          parcel_id?: string | null;
          reported_by?: string;
          reservation_id?: string | null;
          resolution?: string | null;
          resolved_at?: string | null;
          status?: Database["public"]["Enums"]["incident_status"];
          type?: Database["public"]["Enums"]["incident_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "incidents_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incidents_host_id_fkey";
            columns: ["host_id"];
            isOneToOne: false;
            referencedRelation: "host_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incidents_parcel_id_fkey";
            columns: ["parcel_id"];
            isOneToOne: false;
            referencedRelation: "parcels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incidents_reported_by_fkey";
            columns: ["reported_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incidents_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
        ];
      };
      ledger_entries: {
        Row: {
          amount_cents: number;
          created_at: string;
          created_by: string | null;
          entry_type: Database["public"]["Enums"]["ledger_entry_type"];
          host_id: string;
          id: number;
          note: string | null;
          reservation_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          created_at?: string;
          created_by?: string | null;
          entry_type: Database["public"]["Enums"]["ledger_entry_type"];
          host_id: string;
          id?: never;
          note?: string | null;
          reservation_id?: string | null;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          created_by?: string | null;
          entry_type?: Database["public"]["Enums"]["ledger_entry_type"];
          host_id?: string;
          id?: never;
          note?: string | null;
          reservation_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ledger_entries_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ledger_entries_host_id_fkey";
            columns: ["host_id"];
            isOneToOne: false;
            referencedRelation: "host_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ledger_entries_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
        ];
      };
      legal_acceptances: {
        Row: {
          accepted_at: string;
          document: Database["public"]["Enums"]["legal_document"];
          user_id: string;
          version: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string;
          document: Database["public"]["Enums"]["legal_document"];
          user_id?: string;
          version: string;
        };
        Update: {
          accepted_at?: string;
          document?: Database["public"]["Enums"]["legal_document"];
          user_id?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "legal_acceptances_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          payload: NonNullable<Json>;
          read_at: string | null;
          type: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          payload?: NonNullable<Json>;
          read_at?: string | null;
          type: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          payload?: NonNullable<Json>;
          read_at?: string | null;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      parcels: {
        Row: {
          collected_at: string | null;
          created_at: string;
          handed_over_by: string | null;
          id: string;
          photo_path: string | null;
          received_at: string;
          received_by: string | null;
          reservation_id: string;
          size: Database["public"]["Enums"]["parcel_size"];
          status: Database["public"]["Enums"]["parcel_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          collected_at?: string | null;
          created_at?: string;
          handed_over_by?: string | null;
          id?: string;
          photo_path?: string | null;
          received_at?: string;
          received_by?: string | null;
          reservation_id: string;
          size: Database["public"]["Enums"]["parcel_size"];
          status?: Database["public"]["Enums"]["parcel_status"];
          updated_at?: string;
        };
        Update: {
          collected_at?: string | null;
          created_at?: string;
          handed_over_by?: string | null;
          id?: string;
          photo_path?: string | null;
          received_at?: string;
          received_by?: string | null;
          reservation_id?: string;
          size?: Database["public"]["Enums"]["parcel_size"];
          status?: Database["public"]["Enums"]["parcel_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "parcels_handed_over_by_fkey";
            columns: ["handed_over_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parcels_received_by_fkey";
            columns: ["received_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parcels_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
        ];
      };
      pickup_tokens: {
        Row: {
          created_at: string;
          expires_at: string;
          failed_attempts: number;
          id: string;
          pin_hash: string;
          reservation_id: string;
          revoked_at: string | null;
          token_hash: string;
          used_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          expires_at: string;
          failed_attempts?: number;
          id?: string;
          pin_hash: string;
          reservation_id: string;
          revoked_at?: string | null;
          token_hash: string;
          used_at?: string | null;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          failed_attempts?: number;
          id?: string;
          pin_hash?: string;
          reservation_id?: string;
          revoked_at?: string | null;
          token_hash?: string;
          used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pickup_tokens_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
        ];
      };
      privacy_requests: {
        Row: {
          admin_note: string | null;
          completed_at: string | null;
          created_at: string;
          handled_by: string | null;
          id: string;
          status: Database["public"]["Enums"]["privacy_request_status"];
          type: Database["public"]["Enums"]["privacy_request_type"];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          admin_note?: string | null;
          completed_at?: string | null;
          created_at?: string;
          handled_by?: string | null;
          id?: string;
          status?: Database["public"]["Enums"]["privacy_request_status"];
          type: Database["public"]["Enums"]["privacy_request_type"];
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          admin_note?: string | null;
          completed_at?: string | null;
          created_at?: string;
          handled_by?: string | null;
          id?: string;
          status?: Database["public"]["Enums"]["privacy_request_status"];
          type?: Database["public"]["Enums"]["privacy_request_type"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "privacy_requests_handled_by_fkey";
            columns: ["handled_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "privacy_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          full_name: string;
          id: string;
          locale: string;
          phone_e164: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          full_name: string;
          id: string;
          locale?: string;
          phone_e164?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          full_name?: string;
          id?: string;
          locale?: string;
          phone_e164?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      reservations: {
        Row: {
          cancel_reason: string | null;
          cancelled_at: string | null;
          carrier_name: string | null;
          completed_at: string | null;
          created_at: string;
          customer_id: string;
          customer_note: string | null;
          declared_size: Database["public"]["Enums"]["parcel_size"];
          declared_value_cents: number;
          decline_reason: string | null;
          expected_delivery_date: string;
          expires_at: string | null;
          has_open_incident: boolean;
          host_id: string;
          id: string;
          merchant_name: string | null;
          prohibited_items_attested_at: string;
          reference_code: string;
          responded_at: string | null;
          status: Database["public"]["Enums"]["reservation_status"];
          tracking_number: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          carrier_name?: string | null;
          completed_at?: string | null;
          created_at?: string;
          customer_id: string;
          customer_note?: string | null;
          declared_size: Database["public"]["Enums"]["parcel_size"];
          declared_value_cents: number;
          decline_reason?: string | null;
          expected_delivery_date: string;
          expires_at?: string | null;
          has_open_incident?: boolean;
          host_id: string;
          id?: string;
          merchant_name?: string | null;
          prohibited_items_attested_at: string;
          reference_code?: string;
          responded_at?: string | null;
          status?: Database["public"]["Enums"]["reservation_status"];
          tracking_number?: string | null;
          updated_at?: string;
        };
        Update: {
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          carrier_name?: string | null;
          completed_at?: string | null;
          created_at?: string;
          customer_id?: string;
          customer_note?: string | null;
          declared_size?: Database["public"]["Enums"]["parcel_size"];
          declared_value_cents?: number;
          decline_reason?: string | null;
          expected_delivery_date?: string;
          expires_at?: string | null;
          has_open_incident?: boolean;
          host_id?: string;
          id?: string;
          merchant_name?: string | null;
          prohibited_items_attested_at?: string;
          reference_code?: string;
          responded_at?: string | null;
          status?: Database["public"]["Enums"]["reservation_status"];
          tracking_number?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_host_id_fkey";
            columns: ["host_id"];
            isOneToOne: false;
            referencedRelation: "host_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          granted_at: string;
          granted_by: string | null;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          granted_at?: string;
          granted_by?: string | null;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          granted_at?: string;
          granted_by?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_set_role: {
        Args: {
          enabled: boolean;
          target_role: Database["public"]["Enums"]["app_role"];
          target_user: string;
        };
        Returns: undefined;
      };
      custom_access_token_hook: { Args: { event: Json }; Returns: Json };
    };
    Enums: {
      actor_role: "customer" | "host" | "admin" | "system";
      app_role: "customer" | "host" | "admin";
      custody_event_type:
        | "reservation_requested"
        | "reservation_accepted"
        | "reservation_declined"
        | "reservation_cancelled"
        | "reservation_expired"
        | "address_viewed"
        | "parcel_checked_in"
        | "parcel_refused"
        | "pickup_code_issued"
        | "pickup_code_failed"
        | "parcel_handed_over"
        | "parcel_unclaimed"
        | "incident_opened"
        | "incident_resolved"
        | "admin_override";
      host_status: "draft" | "pending_review" | "approved" | "rejected" | "suspended";
      host_type: "individual" | "business";
      incident_status: "open" | "investigating" | "resolved" | "dismissed";
      incident_type:
        | "unknown_parcel"
        | "damaged"
        | "missing"
        | "wrong_parcel"
        | "failed_delivery"
        | "no_show"
        | "safety"
        | "other";
      ledger_entry_type: "earning" | "adjustment" | "payout";
      legal_document: "terms" | "privacy" | "host_agreement";
      parcel_size: "small" | "medium" | "large";
      parcel_status:
        "received" | "collected" | "unclaimed" | "returned" | "lost" | "damaged";
      privacy_request_status: "pending" | "in_progress" | "completed" | "rejected";
      privacy_request_type: "export" | "deletion";
      reservation_status:
        | "requested"
        | "accepted"
        | "declined"
        | "cancelled"
        | "expired"
        | "awaiting_pickup"
        | "collected"
        | "unclaimed"
        | "closed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      actor_role: ["customer", "host", "admin", "system"],
      app_role: ["customer", "host", "admin"],
      custody_event_type: [
        "reservation_requested",
        "reservation_accepted",
        "reservation_declined",
        "reservation_cancelled",
        "reservation_expired",
        "address_viewed",
        "parcel_checked_in",
        "parcel_refused",
        "pickup_code_issued",
        "pickup_code_failed",
        "parcel_handed_over",
        "parcel_unclaimed",
        "incident_opened",
        "incident_resolved",
        "admin_override",
      ],
      host_status: ["draft", "pending_review", "approved", "rejected", "suspended"],
      host_type: ["individual", "business"],
      incident_status: ["open", "investigating", "resolved", "dismissed"],
      incident_type: [
        "unknown_parcel",
        "damaged",
        "missing",
        "wrong_parcel",
        "failed_delivery",
        "no_show",
        "safety",
        "other",
      ],
      ledger_entry_type: ["earning", "adjustment", "payout"],
      legal_document: ["terms", "privacy", "host_agreement"],
      parcel_size: ["small", "medium", "large"],
      parcel_status: [
        "received",
        "collected",
        "unclaimed",
        "returned",
        "lost",
        "damaged",
      ],
      privacy_request_status: ["pending", "in_progress", "completed", "rejected"],
      privacy_request_type: ["export", "deletion"],
      reservation_status: [
        "requested",
        "accepted",
        "declined",
        "cancelled",
        "expired",
        "awaiting_pickup",
        "collected",
        "unclaimed",
        "closed",
      ],
    },
  },
} as const;
