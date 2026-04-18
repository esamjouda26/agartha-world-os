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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      announcement_reads: {
        Row: {
          announcement_id: string
          created_at: string
          read_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          read_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          read_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_targets: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          org_unit_id: string | null
          role_id: string | null
          target_type: Database["public"]["Enums"]["announcement_target_type"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          org_unit_id?: string | null
          role_id?: string | null
          target_type: Database["public"]["Enums"]["announcement_target_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          org_unit_id?: string | null
          role_id?: string | null
          target_type?: Database["public"]["Enums"]["announcement_target_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcement_targets_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_targets_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_targets_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_published: boolean | null
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_published?: boolean | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_published?: boolean | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      app_config: {
        Row: {
          created_at: string
          description: string | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      attendance_exceptions: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          justification_reason: string | null
          justified_at: string | null
          justified_by: string | null
          org_unit_path: unknown
          shift_schedule_id: string
          staff_clarification: string | null
          staff_record_id: string | null
          status: Database["public"]["Enums"]["exception_status"]
          type: Database["public"]["Enums"]["exception_type"]
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          justification_reason?: string | null
          justified_at?: string | null
          justified_by?: string | null
          org_unit_path?: unknown
          shift_schedule_id: string
          staff_clarification?: string | null
          staff_record_id?: string | null
          status?: Database["public"]["Enums"]["exception_status"]
          type: Database["public"]["Enums"]["exception_type"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          justification_reason?: string | null
          justified_at?: string | null
          justified_by?: string | null
          org_unit_path?: unknown
          shift_schedule_id?: string
          staff_clarification?: string | null
          staff_record_id?: string | null
          status?: Database["public"]["Enums"]["exception_status"]
          type?: Database["public"]["Enums"]["exception_type"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_exceptions_shift_schedule_id_fkey"
            columns: ["shift_schedule_id"]
            isOneToOne: false
            referencedRelation: "shift_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_exceptions_shift_schedule_id_fkey"
            columns: ["shift_schedule_id"]
            isOneToOne: false
            referencedRelation: "v_shift_attendance"
            referencedColumns: ["shift_schedule_id"]
          },
        ]
      }
      bill_of_materials: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          id: string
          is_default: boolean | null
          parent_material_id: string
          status: string
          updated_at: string | null
          updated_by: string | null
          version: number
          yield_qty: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_default?: boolean | null
          parent_material_id: string
          status?: string
          updated_at?: string | null
          updated_by?: string | null
          version?: number
          yield_qty?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_default?: boolean | null
          parent_material_id?: string
          status?: string
          updated_at?: string | null
          updated_by?: string | null
          version?: number
          yield_qty?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bill_of_materials_parent_material_id_fkey"
            columns: ["parent_material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      biometric_access_log: {
        Row: {
          actor_id: string | null
          actor_type: string
          attendee_id: string
          confidence_score: number | null
          created_at: string
          event: string
          id: string
          ip_address: unknown
          match_result: boolean | null
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_type: string
          attendee_id: string
          confidence_score?: number | null
          created_at?: string
          event: string
          id?: string
          ip_address?: unknown
          match_result?: boolean | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          attendee_id?: string
          confidence_score?: number | null
          created_at?: string
          event?: string
          id?: string
          ip_address?: unknown
          match_result?: boolean | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biometric_access_log_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "booking_attendees"
            referencedColumns: ["id"]
          },
        ]
      }
      biometric_vectors: {
        Row: {
          attendee_id: string
          created_at: string
          id: string
          updated_at: string | null
          vector_hash: string
        }
        Insert: {
          attendee_id: string
          created_at?: string
          id?: string
          updated_at?: string | null
          vector_hash: string
        }
        Update: {
          attendee_id?: string
          created_at?: string
          id?: string
          updated_at?: string | null
          vector_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "biometric_vectors_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: true
            referencedRelation: "booking_attendees"
            referencedColumns: ["id"]
          },
        ]
      }
      bom_components: {
        Row: {
          bom_id: string
          component_material_id: string
          created_at: string
          created_by: string | null
          id: string
          is_phantom: boolean | null
          quantity: number
          scrap_pct: number | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          bom_id: string
          component_material_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_phantom?: boolean | null
          quantity: number
          scrap_pct?: number | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          bom_id?: string
          component_material_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_phantom?: boolean | null
          quantity?: number
          scrap_pct?: number | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bom_components_bom_id_fkey"
            columns: ["bom_id"]
            isOneToOne: false
            referencedRelation: "bill_of_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_components_component_material_id_fkey"
            columns: ["component_material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_attendees: {
        Row: {
          attendee_index: number
          attendee_type: Database["public"]["Enums"]["attendee_type"]
          auto_capture_enabled: boolean | null
          booking_id: string
          created_at: string
          face_pay_enabled: boolean | null
          id: string
          nickname: string | null
          updated_at: string | null
        }
        Insert: {
          attendee_index: number
          attendee_type: Database["public"]["Enums"]["attendee_type"]
          auto_capture_enabled?: boolean | null
          booking_id: string
          created_at?: string
          face_pay_enabled?: boolean | null
          id?: string
          nickname?: string | null
          updated_at?: string | null
        }
        Update: {
          attendee_index?: number
          attendee_type?: Database["public"]["Enums"]["attendee_type"]
          auto_capture_enabled?: boolean | null
          booking_id?: string
          created_at?: string
          face_pay_enabled?: boolean | null
          id?: string
          nickname?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_attendees_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          currency: string | null
          gateway_ref: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at: string | null
          payment_intent_id: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          currency?: string | null
          gateway_ref?: string | null
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at?: string | null
          payment_intent_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          currency?: string | null
          gateway_ref?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string | null
          payment_intent_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          adult_count: number | null
          booker_email: string
          booker_name: string
          booker_phone: string
          booking_ref: string
          cancelled_at: string | null
          checked_in_at: string | null
          child_count: number | null
          created_at: string
          experience_id: string
          id: string
          promo_code_id: string | null
          qr_code_ref: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          tier_id: string
          time_slot_id: string
          total_price: number
          updated_at: string | null
        }
        Insert: {
          adult_count?: number | null
          booker_email: string
          booker_name: string
          booker_phone: string
          booking_ref: string
          cancelled_at?: string | null
          checked_in_at?: string | null
          child_count?: number | null
          created_at?: string
          experience_id: string
          id?: string
          promo_code_id?: string | null
          qr_code_ref?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          tier_id: string
          time_slot_id: string
          total_price: number
          updated_at?: string | null
        }
        Update: {
          adult_count?: number | null
          booker_email?: string
          booker_name?: string
          booker_phone?: string
          booking_ref?: string
          cancelled_at?: string | null
          checked_in_at?: string | null
          child_count?: number | null
          created_at?: string
          experience_id?: string
          id?: string
          promo_code_id?: string | null
          qr_code_ref?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          tier_id?: string
          time_slot_id?: string
          total_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_time_slot_id_fkey"
            columns: ["time_slot_id"]
            isOneToOne: false
            referencedRelation: "time_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          budget: number | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: Database["public"]["Enums"]["lifecycle_status"] | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          budget?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["lifecycle_status"] | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          budget?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["lifecycle_status"] | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      captured_photos: {
        Row: {
          attendee_id: string | null
          booking_id: string
          captured_at: string
          created_at: string
          device_id: string | null
          expires_at: string
          id: string
          storage_path: string
          updated_at: string | null
        }
        Insert: {
          attendee_id?: string | null
          booking_id: string
          captured_at?: string
          created_at?: string
          device_id?: string | null
          expires_at: string
          id?: string
          storage_path: string
          updated_at?: string | null
        }
        Update: {
          attendee_id?: string | null
          booking_id?: string
          captured_at?: string
          created_at?: string
          device_id?: string | null
          expires_at?: string
          id?: string
          storage_path?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "captured_photos_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "booking_attendees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "captured_photos_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "captured_photos_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_records: {
        Row: {
          consent_type: string
          created_at: string
          granted_at: string
          id: string
          ip_address: unknown
          legal_basis: string
          policy_version: string
          purpose: string
          retention_policy: string
          subject_id: string
          subject_type: string
          updated_at: string | null
          user_agent: string | null
          withdrawal_method: string | null
          withdrawn_at: string | null
        }
        Insert: {
          consent_type: string
          created_at?: string
          granted_at?: string
          id?: string
          ip_address?: unknown
          legal_basis: string
          policy_version: string
          purpose: string
          retention_policy: string
          subject_id: string
          subject_type: string
          updated_at?: string | null
          user_agent?: string | null
          withdrawal_method?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          consent_type?: string
          created_at?: string
          granted_at?: string
          id?: string
          ip_address?: unknown
          legal_basis?: string
          policy_version?: string
          purpose?: string
          retention_policy?: string
          subject_id?: string
          subject_type?: string
          updated_at?: string | null
          user_agent?: string | null
          withdrawal_method?: string | null
          withdrawn_at?: string | null
        }
        Relationships: []
      }
      crew_zones: {
        Row: {
          created_at: string
          id: string
          left_at: string | null
          org_unit_path: unknown
          scanned_at: string | null
          staff_record_id: string
          updated_at: string | null
          zone_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          left_at?: string | null
          org_unit_path?: unknown
          scanned_at?: string | null
          staff_record_id: string
          updated_at?: string | null
          zone_id: string
        }
        Update: {
          created_at?: string
          id?: string
          left_at?: string | null
          org_unit_path?: unknown
          scanned_at?: string | null
          staff_record_id?: string
          updated_at?: string | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_zones_staff_record_id_fkey"
            columns: ["staff_record_id"]
            isOneToOne: false
            referencedRelation: "staff_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_zones_staff_record_id_fkey"
            columns: ["staff_record_id"]
            isOneToOne: false
            referencedRelation: "v_staff_exception_stats"
            referencedColumns: ["staff_record_id"]
          },
          {
            foreignKeyName: "crew_zones_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      device_heartbeats: {
        Row: {
          created_at: string
          device_id: string
          id: string
          metadata: Json | null
          recorded_at: string | null
          response_time_ms: number | null
          status: Database["public"]["Enums"]["heartbeat_status"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          metadata?: Json | null
          recorded_at?: string | null
          response_time_ms?: number | null
          status?: Database["public"]["Enums"]["heartbeat_status"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          metadata?: Json | null
          recorded_at?: string | null
          response_time_ms?: number | null
          status?: Database["public"]["Enums"]["heartbeat_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_heartbeats_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      device_types: {
        Row: {
          created_at: string
          display_name: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      devices: {
        Row: {
          asset_tag: string | null
          commission_date: string | null
          created_at: string
          created_by: string | null
          device_type_id: string
          firmware_version: string | null
          id: string
          ip_address: unknown
          mac_address: unknown
          maintenance_vendor_id: string | null
          manufacturer: string | null
          metadata: Json | null
          model: string | null
          name: string
          parent_device_id: string | null
          port_number: number | null
          serial_number: string | null
          status: Database["public"]["Enums"]["device_status"] | null
          updated_at: string | null
          updated_by: string | null
          vlan_id: number | null
          warranty_expiry: string | null
          zone_id: string | null
        }
        Insert: {
          asset_tag?: string | null
          commission_date?: string | null
          created_at?: string
          created_by?: string | null
          device_type_id: string
          firmware_version?: string | null
          id?: string
          ip_address?: unknown
          mac_address?: unknown
          maintenance_vendor_id?: string | null
          manufacturer?: string | null
          metadata?: Json | null
          model?: string | null
          name: string
          parent_device_id?: string | null
          port_number?: number | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["device_status"] | null
          updated_at?: string | null
          updated_by?: string | null
          vlan_id?: number | null
          warranty_expiry?: string | null
          zone_id?: string | null
        }
        Update: {
          asset_tag?: string | null
          commission_date?: string | null
          created_at?: string
          created_by?: string | null
          device_type_id?: string
          firmware_version?: string | null
          id?: string
          ip_address?: unknown
          mac_address?: unknown
          maintenance_vendor_id?: string | null
          manufacturer?: string | null
          metadata?: Json | null
          model?: string | null
          name?: string
          parent_device_id?: string | null
          port_number?: number | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["device_status"] | null
          updated_at?: string | null
          updated_by?: string | null
          vlan_id?: number | null
          warranty_expiry?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_device_type_id_fkey"
            columns: ["device_type_id"]
            isOneToOne: false
            referencedRelation: "device_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_maintenance_vendor_id_fkey"
            columns: ["maintenance_vendor_id"]
            isOneToOne: false
            referencedRelation: "maintenance_vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_parent_device_id_fkey"
            columns: ["parent_device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_vlan_id_fkey"
            columns: ["vlan_id"]
            isOneToOne: false
            referencedRelation: "vlans"
            referencedColumns: ["vlan_id"]
          },
          {
            foreignKeyName: "devices_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      display_categories: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          pos_point_id: string
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          pos_point_id: string
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          pos_point_id?: string
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "display_categories_pos_point_id_fkey"
            columns: ["pos_point_id"]
            isOneToOne: false
            referencedRelation: "pos_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "display_categories_pos_point_id_fkey"
            columns: ["pos_point_id"]
            isOneToOne: false
            referencedRelation: "v_pos_point_today_stats"
            referencedColumns: ["pos_point_id"]
          },
        ]
      }
      equipment_assignments: {
        Row: {
          assigned_at: string
          assigned_to: string
          condition_on_return: string | null
          created_at: string
          created_by: string | null
          id: string
          material_id: string
          notes: string | null
          returned_at: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_to: string
          condition_on_return?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          material_id: string
          notes?: string | null
          returned_at?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_to?: string
          condition_on_return?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          material_id?: string
          notes?: string | null
          returned_at?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_assignments_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_tiers: {
        Row: {
          created_at: string
          experience_id: string
          tier_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          experience_id: string
          tier_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          experience_id?: string
          tier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "experience_tiers_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experience_tiers_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      experiences: {
        Row: {
          arrival_window_minutes: number | null
          capacity_per_slot: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_facility_capacity: number
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          arrival_window_minutes?: number | null
          capacity_per_slot?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_facility_capacity: number
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          arrival_window_minutes?: number | null
          capacity_per_slot?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_facility_capacity?: number
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      goods_movement_items: {
        Row: {
          bom_id: string | null
          cost_center_id: string | null
          created_at: string
          goods_movement_id: string
          id: string
          location_id: string
          material_id: string
          quantity: number
          total_cost: number | null
          unit_cost: number
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          bom_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          goods_movement_id: string
          id?: string
          location_id: string
          material_id: string
          quantity: number
          total_cost?: number | null
          unit_cost: number
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          bom_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          goods_movement_id?: string
          id?: string
          location_id?: string
          material_id?: string
          quantity?: number
          total_cost?: number | null
          unit_cost?: number
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goods_movement_items_bom_id_fkey"
            columns: ["bom_id"]
            isOneToOne: false
            referencedRelation: "bill_of_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_movement_items_goods_movement_id_fkey"
            columns: ["goods_movement_id"]
            isOneToOne: false
            referencedRelation: "goods_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_movement_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_movement_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_movement_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_movements: {
        Row: {
          created_at: string
          created_by: string | null
          disposal_id: string | null
          document_date: string
          id: string
          movement_type_id: string
          notes: string | null
          order_id: string | null
          posting_date: string
          purchase_order_id: string | null
          reconciliation_id: string | null
          requisition_id: string | null
          reversed_by_id: string | null
          reverses_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          disposal_id?: string | null
          document_date?: string
          id?: string
          movement_type_id: string
          notes?: string | null
          order_id?: string | null
          posting_date?: string
          purchase_order_id?: string | null
          reconciliation_id?: string | null
          requisition_id?: string | null
          reversed_by_id?: string | null
          reverses_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          disposal_id?: string | null
          document_date?: string
          id?: string
          movement_type_id?: string
          notes?: string | null
          order_id?: string | null
          posting_date?: string
          purchase_order_id?: string | null
          reconciliation_id?: string | null
          requisition_id?: string | null
          reversed_by_id?: string | null
          reverses_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goods_movements_disposal_id_fkey"
            columns: ["disposal_id"]
            isOneToOne: false
            referencedRelation: "write_offs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_movements_movement_type_id_fkey"
            columns: ["movement_type_id"]
            isOneToOne: false
            referencedRelation: "movement_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_movements_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_movements_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "inventory_reconciliations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_movements_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "material_requisitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_movements_reversed_by_id_fkey"
            columns: ["reversed_by_id"]
            isOneToOne: false
            referencedRelation: "goods_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_movements_reverses_id_fkey"
            columns: ["reverses_id"]
            isOneToOne: false
            referencedRelation: "goods_movements"
            referencedColumns: ["id"]
          },
        ]
      }
      iam_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          current_role_id: string | null
          hr_remark: string | null
          id: string
          invite_sent_at: string | null
          it_remark: string | null
          request_type: Database["public"]["Enums"]["iam_request_type"]
          staff_record_id: string
          status: Database["public"]["Enums"]["iam_request_status"] | null
          target_role_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          current_role_id?: string | null
          hr_remark?: string | null
          id?: string
          invite_sent_at?: string | null
          it_remark?: string | null
          request_type: Database["public"]["Enums"]["iam_request_type"]
          staff_record_id: string
          status?: Database["public"]["Enums"]["iam_request_status"] | null
          target_role_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          current_role_id?: string | null
          hr_remark?: string | null
          id?: string
          invite_sent_at?: string | null
          it_remark?: string | null
          request_type?: Database["public"]["Enums"]["iam_request_type"]
          staff_record_id?: string
          status?: Database["public"]["Enums"]["iam_request_status"] | null
          target_role_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "iam_requests_current_role_id_fkey"
            columns: ["current_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iam_requests_staff_record_id_fkey"
            columns: ["staff_record_id"]
            isOneToOne: false
            referencedRelation: "staff_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iam_requests_staff_record_id_fkey"
            columns: ["staff_record_id"]
            isOneToOne: false
            referencedRelation: "v_staff_exception_stats"
            referencedColumns: ["staff_record_id"]
          },
          {
            foreignKeyName: "iam_requests_target_role_id_fkey"
            columns: ["target_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_keys: {
        Row: {
          actor_id: string | null
          created_at: string
          expires_at: string
          key: string
          response_hash: string
          scope: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          expires_at?: string
          key: string
          response_hash: string
          scope: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          expires_at?: string
          key?: string
          response_hash?: string
          scope?: string
        }
        Relationships: []
      }
      incidents: {
        Row: {
          attachment_url: string | null
          category: Database["public"]["Enums"]["incident_category"]
          created_at: string
          created_by: string | null
          description: string
          id: string
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["incident_status"] | null
          updated_at: string | null
          updated_by: string | null
          zone_id: string | null
        }
        Insert: {
          attachment_url?: string | null
          category: Database["public"]["Enums"]["incident_category"]
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["incident_status"] | null
          updated_at?: string | null
          updated_by?: string | null
          zone_id?: string | null
        }
        Update: {
          attachment_url?: string | null
          category?: Database["public"]["Enums"]["incident_category"]
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["incident_status"] | null
          updated_at?: string | null
          updated_by?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_reconciliation_items: {
        Row: {
          created_at: string
          id: string
          material_id: string
          photo_url: string | null
          physical_qty: number
          reconciliation_id: string
          system_qty: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          photo_url?: string | null
          physical_qty?: number
          reconciliation_id: string
          system_qty: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          photo_url?: string | null
          physical_qty?: number
          reconciliation_id?: string
          system_qty?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reconciliation_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reconciliation_items_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "inventory_reconciliations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_reconciliations: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          crew_remark: string | null
          discrepancy_found: boolean | null
          id: string
          location_id: string
          manager_remark: string | null
          scheduled_date: string
          scheduled_time: string
          status: Database["public"]["Enums"]["inventory_task_status"] | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          crew_remark?: string | null
          discrepancy_found?: boolean | null
          id?: string
          location_id: string
          manager_remark?: string | null
          scheduled_date?: string
          scheduled_time?: string
          status?: Database["public"]["Enums"]["inventory_task_status"] | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          crew_remark?: string | null
          discrepancy_found?: boolean | null
          id?: string
          location_id?: string
          manager_remark?: string | null
          scheduled_date?: string
          scheduled_time?: string
          status?: Database["public"]["Enums"]["inventory_task_status"] | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reconciliations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_ledger: {
        Row: {
          created_at: string
          created_by: string | null
          days: number
          fiscal_year: number
          id: string
          leave_request_id: string | null
          leave_type_id: string
          notes: string | null
          org_unit_path: unknown
          staff_record_id: string
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["leave_transaction_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          days: number
          fiscal_year: number
          id?: string
          leave_request_id?: string | null
          leave_type_id: string
          notes?: string | null
          org_unit_path?: unknown
          staff_record_id: string
          transaction_date?: string
          transaction_type: Database["public"]["Enums"]["leave_transaction_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          days?: number
          fiscal_year?: number
          id?: string
          leave_request_id?: string | null
          leave_type_id?: string
          notes?: string | null
          org_unit_path?: unknown
          staff_record_id?: string
          transaction_date?: string
          transaction_type?: Database["public"]["Enums"]["leave_transaction_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_ledger_leave_request_id_fkey"
            columns: ["leave_request_id"]
            isOneToOne: false
            referencedRelation: "leave_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_ledger_leave_request_id_fkey"
            columns: ["leave_request_id"]
            isOneToOne: false
            referencedRelation: "v_shift_attendance"
            referencedColumns: ["leave_request_id"]
          },
          {
            foreignKeyName: "leave_ledger_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_ledger_staff_record_id_fkey"
            columns: ["staff_record_id"]
            isOneToOne: false
            referencedRelation: "staff_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_ledger_staff_record_id_fkey"
            columns: ["staff_record_id"]
            isOneToOne: false
            referencedRelation: "v_staff_exception_stats"
            referencedColumns: ["staff_record_id"]
          },
        ]
      }
      leave_policies: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      leave_policy_entitlements: {
        Row: {
          created_at: string
          days_per_year: number
          frequency: Database["public"]["Enums"]["accrual_frequency"]
          leave_type_id: string
          policy_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          days_per_year: number
          frequency?: Database["public"]["Enums"]["accrual_frequency"]
          leave_type_id: string
          policy_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          days_per_year?: number
          frequency?: Database["public"]["Enums"]["accrual_frequency"]
          leave_type_id?: string
          policy_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_policy_entitlements_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_policy_entitlements_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "leave_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          leave_type_id: string
          org_unit_path: unknown
          reason: string | null
          rejection_reason: string | null
          requested_days: number
          reviewed_at: string | null
          reviewed_by: string | null
          staff_record_id: string
          start_date: string
          status: Database["public"]["Enums"]["leave_request_status"]
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          leave_type_id: string
          org_unit_path?: unknown
          reason?: string | null
          rejection_reason?: string | null
          requested_days: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          staff_record_id: string
          start_date: string
          status?: Database["public"]["Enums"]["leave_request_status"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          leave_type_id?: string
          org_unit_path?: unknown
          reason?: string | null
          rejection_reason?: string | null
          requested_days?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          staff_record_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["leave_request_status"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_staff_record_id_fkey"
            columns: ["staff_record_id"]
            isOneToOne: false
            referencedRelation: "staff_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_staff_record_id_fkey"
            columns: ["staff_record_id"]
            isOneToOne: false
            referencedRelation: "v_staff_exception_stats"
            referencedColumns: ["staff_record_id"]
          },
        ]
      }
      leave_types: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_paid: boolean
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_paid?: boolean
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_paid?: boolean
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      location_allowed_categories: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          location_id: string
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          location_id: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          location_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_allowed_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "material_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_allowed_categories_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          org_unit_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          org_unit_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          org_unit_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_orders: {
        Row: {
          authorized_at: string | null
          authorized_by: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          mad_limit_minutes: number | null
          maintenance_end: string
          maintenance_start: string
          network_group: string | null
          scope: string | null
          sponsor_id: string | null
          sponsor_remark: string | null
          status: Database["public"]["Enums"]["mo_status"] | null
          switch_port: string | null
          target_ci_id: string
          topology: Database["public"]["Enums"]["mo_topology"]
          updated_at: string | null
          updated_by: string | null
          vendor_id: string
          vendor_mac_address: unknown
        }
        Insert: {
          authorized_at?: string | null
          authorized_by?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mad_limit_minutes?: number | null
          maintenance_end: string
          maintenance_start: string
          network_group?: string | null
          scope?: string | null
          sponsor_id?: string | null
          sponsor_remark?: string | null
          status?: Database["public"]["Enums"]["mo_status"] | null
          switch_port?: string | null
          target_ci_id: string
          topology: Database["public"]["Enums"]["mo_topology"]
          updated_at?: string | null
          updated_by?: string | null
          vendor_id: string
          vendor_mac_address?: unknown
        }
        Update: {
          authorized_at?: string | null
          authorized_by?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mad_limit_minutes?: number | null
          maintenance_end?: string
          maintenance_start?: string
          network_group?: string | null
          scope?: string | null
          sponsor_id?: string | null
          sponsor_remark?: string | null
          status?: Database["public"]["Enums"]["mo_status"] | null
          switch_port?: string | null
          target_ci_id?: string
          topology?: Database["public"]["Enums"]["mo_topology"]
          updated_at?: string | null
          updated_by?: string | null
          vendor_id?: string
          vendor_mac_address?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_orders_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "staff_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_orders_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "v_staff_exception_stats"
            referencedColumns: ["staff_record_id"]
          },
          {
            foreignKeyName: "maintenance_orders_target_ci_id_fkey"
            columns: ["target_ci_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "maintenance_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_vendors: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          specialization: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          specialization?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          specialization?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      material_categories: {
        Row: {
          accounting_category: string | null
          code: string | null
          created_at: string
          created_by: string | null
          default_valuation: string | null
          depth: number
          id: string
          is_active: boolean | null
          is_bom_eligible: boolean | null
          is_consumable: boolean | null
          name: string
          parent_id: string | null
          path: unknown
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          accounting_category?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          default_valuation?: string | null
          depth?: number
          id?: string
          is_active?: boolean | null
          is_bom_eligible?: boolean | null
          is_consumable?: boolean | null
          name: string
          parent_id?: string | null
          path: unknown
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          accounting_category?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          default_valuation?: string | null
          depth?: number
          id?: string
          is_active?: boolean | null
          is_bom_eligible?: boolean | null
          is_consumable?: boolean | null
          name?: string
          parent_id?: string | null
          path?: unknown
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "material_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      material_modifier_groups: {
        Row: {
          created_at: string
          created_by: string | null
          material_id: string
          modifier_group_id: string
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          material_id: string
          modifier_group_id: string
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          material_id?: string
          modifier_group_id?: string
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_modifier_groups_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_modifier_groups_modifier_group_id_fkey"
            columns: ["modifier_group_id"]
            isOneToOne: false
            referencedRelation: "pos_modifier_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      material_procurement_data: {
        Row: {
          cost_price: number
          created_at: string
          is_default: boolean
          lead_time_days: number | null
          material_id: string
          min_order_qty: number | null
          purchase_unit_id: string
          supplier_id: string
          supplier_sku: string | null
          updated_at: string | null
        }
        Insert: {
          cost_price: number
          created_at?: string
          is_default?: boolean
          lead_time_days?: number | null
          material_id: string
          min_order_qty?: number | null
          purchase_unit_id: string
          supplier_id: string
          supplier_sku?: string | null
          updated_at?: string | null
        }
        Update: {
          cost_price?: number
          created_at?: string
          is_default?: boolean
          lead_time_days?: number | null
          material_id?: string
          min_order_qty?: number | null
          purchase_unit_id?: string
          supplier_id?: string
          supplier_sku?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_procurement_data_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_procurement_data_purchase_unit_id_fkey"
            columns: ["purchase_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_procurement_data_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_procurement_data_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_open_po_stats"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      material_requisition_items: {
        Row: {
          created_at: string
          delivered_qty: number | null
          id: string
          material_id: string
          movement_type_code: string
          photo_url: string | null
          requested_qty: number
          requisition_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          delivered_qty?: number | null
          id?: string
          material_id: string
          movement_type_code: string
          photo_url?: string | null
          requested_qty: number
          requisition_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          delivered_qty?: number | null
          id?: string
          material_id?: string
          movement_type_code?: string
          photo_url?: string | null
          requested_qty?: number
          requisition_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_requisition_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_requisition_items_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "material_requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      material_requisitions: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          from_location_id: string
          id: string
          requester_remark: string | null
          runner_remark: string | null
          status: Database["public"]["Enums"]["inventory_task_status"] | null
          to_location_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          from_location_id: string
          id?: string
          requester_remark?: string | null
          runner_remark?: string | null
          status?: Database["public"]["Enums"]["inventory_task_status"] | null
          to_location_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          from_location_id?: string
          id?: string
          requester_remark?: string | null
          runner_remark?: string | null
          status?: Database["public"]["Enums"]["inventory_task_status"] | null
          to_location_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_requisitions_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_requisitions_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      material_sales_data: {
        Row: {
          allergens: string | null
          created_at: string
          created_by: string | null
          display_category_id: string | null
          display_name: string | null
          image_url: string | null
          is_active: boolean | null
          material_id: string
          pos_point_id: string
          selling_price: number
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          allergens?: string | null
          created_at?: string
          created_by?: string | null
          display_category_id?: string | null
          display_name?: string | null
          image_url?: string | null
          is_active?: boolean | null
          material_id: string
          pos_point_id: string
          selling_price: number
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          allergens?: string | null
          created_at?: string
          created_by?: string | null
          display_category_id?: string | null
          display_name?: string | null
          image_url?: string | null
          is_active?: boolean | null
          material_id?: string
          pos_point_id?: string
          selling_price?: number
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_sales_data_display_category_id_pos_point_id_fkey"
            columns: ["display_category_id", "pos_point_id"]
            isOneToOne: false
            referencedRelation: "display_categories"
            referencedColumns: ["id", "pos_point_id"]
          },
          {
            foreignKeyName: "material_sales_data_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_sales_data_pos_point_id_fkey"
            columns: ["pos_point_id"]
            isOneToOne: false
            referencedRelation: "pos_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_sales_data_pos_point_id_fkey"
            columns: ["pos_point_id"]
            isOneToOne: false
            referencedRelation: "v_pos_point_today_stats"
            referencedColumns: ["pos_point_id"]
          },
        ]
      }
      material_valuation: {
        Row: {
          created_at: string
          last_purchase_cost: number | null
          location_id: string
          material_id: string
          moving_avg_cost: number | null
          standard_cost: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          last_purchase_cost?: number | null
          location_id: string
          material_id: string
          moving_avg_cost?: number | null
          standard_cost?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          last_purchase_cost?: number | null
          location_id?: string
          material_id?: string
          moving_avg_cost?: number | null
          standard_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_valuation_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_valuation_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          barcode: string | null
          base_unit_id: string
          category_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          is_returnable: boolean | null
          material_type: Database["public"]["Enums"]["material_type"]
          name: string
          reorder_point: number | null
          safety_stock: number | null
          shelf_life_days: number | null
          sku: string | null
          standard_cost: number | null
          storage_conditions: string | null
          updated_at: string | null
          updated_by: string | null
          valuation_method: string | null
          weight_kg: number | null
        }
        Insert: {
          barcode?: string | null
          base_unit_id: string
          category_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_returnable?: boolean | null
          material_type: Database["public"]["Enums"]["material_type"]
          name: string
          reorder_point?: number | null
          safety_stock?: number | null
          shelf_life_days?: number | null
          sku?: string | null
          standard_cost?: number | null
          storage_conditions?: string | null
          updated_at?: string | null
          updated_by?: string | null
          valuation_method?: string | null
          weight_kg?: number | null
        }
        Update: {
          barcode?: string | null
          base_unit_id?: string
          category_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_returnable?: boolean | null
          material_type?: Database["public"]["Enums"]["material_type"]
          name?: string
          reorder_point?: number | null
          safety_stock?: number | null
          shelf_life_days?: number | null
          sku?: string | null
          standard_cost?: number | null
          storage_conditions?: string | null
          updated_at?: string | null
          updated_by?: string | null
          valuation_method?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_base_unit_id_fkey"
            columns: ["base_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "material_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      movement_types: {
        Row: {
          auto_reverse_code: string | null
          code: string
          created_at: string
          credit_account_rule: string | null
          debit_account_rule: string | null
          description: string | null
          direction: string
          id: string
          is_active: boolean | null
          name: string
          requires_cost_center: boolean | null
          requires_source_doc: boolean | null
          updated_at: string | null
        }
        Insert: {
          auto_reverse_code?: string | null
          code: string
          created_at?: string
          credit_account_rule?: string | null
          debit_account_rule?: string | null
          description?: string | null
          direction: string
          id?: string
          is_active?: boolean | null
          name: string
          requires_cost_center?: boolean | null
          requires_source_doc?: boolean | null
          updated_at?: string | null
        }
        Update: {
          auto_reverse_code?: string | null
          code?: string
          created_at?: string
          credit_account_rule?: string | null
          debit_account_rule?: string | null
          description?: string | null
          direction?: string
          id?: string
          is_active?: boolean | null
          name?: string
          requires_cost_center?: boolean | null
          requires_source_doc?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      order_item_modifiers: {
        Row: {
          created_at: string
          id: string
          material_id: string | null
          modifier_option_id: string
          option_name: string
          order_item_id: string
          price_delta: number
          quantity_delta: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          material_id?: string | null
          modifier_option_id: string
          option_name: string
          order_item_id: string
          price_delta?: number
          quantity_delta?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string | null
          modifier_option_id?: string
          option_name?: string
          order_item_id?: string
          price_delta?: number
          quantity_delta?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_item_modifiers_modifier_option_id_fkey"
            columns: ["modifier_option_id"]
            isOneToOne: false
            referencedRelation: "pos_modifier_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_modifiers_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          material_id: string
          order_id: string
          quantity: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          order_id: string
          quantity: number
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          order_id?: string
          quantity?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          pos_point_id: string
          prepared_by: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          total_amount: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          pos_point_id: string
          prepared_by?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          pos_point_id?: string
          prepared_by?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_pos_point_id_fkey"
            columns: ["pos_point_id"]
            isOneToOne: false
            referencedRelation: "pos_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_pos_point_id_fkey"
            columns: ["pos_point_id"]
            isOneToOne: false
            referencedRelation: "v_pos_point_today_stats"
            referencedColumns: ["pos_point_id"]
          },
        ]
      }
      org_units: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          manager_id: string | null
          name: string
          parent_id: string | null
          path: unknown
          unit_type: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          name: string
          parent_id?: string | null
          path: unknown
          unit_type: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          name?: string
          parent_id?: string | null
          path?: unknown
          unit_type?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_units_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_units_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_challenges: {
        Row: {
          attempts: number | null
          booking_ref: string
          created_at: string
          expires_at: string | null
          id: string
          ip_address: unknown
          otp_code: string
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          attempts?: number | null
          booking_ref: string
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          otp_code: string
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          attempts?: number | null
          booking_ref?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          otp_code?: string
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "otp_challenges_booking_ref_fkey"
            columns: ["booking_ref"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["booking_ref"]
          },
        ]
      }
      payment_webhook_events: {
        Row: {
          created_at: string
          event_id: string
          event_type: string
          last_error: string | null
          payment_intent_id: string
          processed_at: string | null
          processing_attempts: number
          raw_payload: Json
          received_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          event_type: string
          last_error?: string | null
          payment_intent_id: string
          processed_at?: string | null
          processing_attempts?: number
          raw_payload: Json
          received_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string
          last_error?: string | null
          payment_intent_id?: string
          processed_at?: string | null
          processing_attempts?: number
          raw_payload?: Json
          received_at?: string
        }
        Relationships: []
      }
      payment_webhook_events_dlq: {
        Row: {
          event_id: string
          failure_count: number
          last_error: string
          moved_at: string
          original_event: Json
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          event_id: string
          failure_count: number
          last_error: string
          moved_at?: string
          original_event: Json
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          event_id?: string
          failure_count?: number
          last_error?: string
          moved_at?: string
          original_event?: Json
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_webhook_events_dlq_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_domains: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      pos_modifier_groups: {
        Row: {
          created_at: string
          created_by: string | null
          display_name: string
          id: string
          is_active: boolean | null
          max_selections: number | null
          min_selections: number | null
          name: string
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          max_selections?: number | null
          min_selections?: number | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          max_selections?: number | null
          min_selections?: number | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      pos_modifier_options: {
        Row: {
          created_at: string
          created_by: string | null
          group_id: string
          id: string
          is_active: boolean | null
          material_id: string | null
          name: string
          price_delta: number
          quantity_delta: number
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          group_id: string
          id?: string
          is_active?: boolean | null
          material_id?: string | null
          name: string
          price_delta?: number
          quantity_delta?: number
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          group_id?: string
          id?: string
          is_active?: boolean | null
          material_id?: string | null
          name?: string
          price_delta?: number
          quantity_delta?: number
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_modifier_options_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "pos_modifier_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_modifier_options_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_points: {
        Row: {
          created_at: string
          created_by: string | null
          display_name: string
          id: string
          is_active: boolean | null
          location_id: string
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          location_id: string
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          location_id?: string
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_points_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      price_list_items: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          material_id: string
          min_qty: number | null
          pos_point_id: string | null
          price_list_id: string
          unit_price: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id: string
          min_qty?: number | null
          pos_point_id?: string | null
          price_list_id: string
          unit_price: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id?: string
          min_qty?: number | null
          pos_point_id?: string | null
          price_list_id?: string
          unit_price?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_list_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_list_items_pos_point_id_fkey"
            columns: ["pos_point_id"]
            isOneToOne: false
            referencedRelation: "pos_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_list_items_pos_point_id_fkey"
            columns: ["pos_point_id"]
            isOneToOne: false
            referencedRelation: "v_pos_point_today_stats"
            referencedColumns: ["pos_point_id"]
          },
          {
            foreignKeyName: "price_list_items_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      price_lists: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
          updated_by: string | null
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
          updated_by?: string | null
          valid_from: string
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          updated_by?: string | null
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          display_name: string | null
          email: string | null
          employee_id: string | null
          employment_status:
            | Database["public"]["Enums"]["employment_status"]
            | null
          id: string
          is_locked: boolean | null
          last_permission_update: string | null
          locked_at: string | null
          locked_by: string | null
          locked_reason: string | null
          password_set: boolean | null
          role_id: string | null
          staff_record_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          email?: string | null
          employee_id?: string | null
          employment_status?:
            | Database["public"]["Enums"]["employment_status"]
            | null
          id: string
          is_locked?: boolean | null
          last_permission_update?: string | null
          locked_at?: string | null
          locked_by?: string | null
          locked_reason?: string | null
          password_set?: boolean | null
          role_id?: string | null
          staff_record_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          email?: string | null
          employee_id?: string | null
          employment_status?:
            | Database["public"]["Enums"]["employment_status"]
            | null
          id?: string
          is_locked?: boolean | null
          last_permission_update?: string | null
          locked_at?: string | null
          locked_by?: string | null
          locked_reason?: string | null
          password_set?: boolean | null
          role_id?: string | null
          staff_record_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_staff_record_id_fkey"
            columns: ["staff_record_id"]
            isOneToOne: true
            referencedRelation: "staff_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_staff_record_id_fkey"
            columns: ["staff_record_id"]
            isOneToOne: true
            referencedRelation: "v_staff_exception_stats"
            referencedColumns: ["staff_record_id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          campaign_id: string | null
          code: string
          created_at: string
          created_by: string | null
          current_uses: number | null
          description: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id: string
          max_uses: number | null
          min_group_size: number | null
          status: Database["public"]["Enums"]["lifecycle_status"] | null
          updated_at: string | null
          updated_by: string | null
          valid_days_mask: number | null
          valid_from: string
          valid_time_end: string | null
          valid_time_start: string | null
          valid_to: string
        }
        Insert: {
          campaign_id?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id?: string
          max_uses?: number | null
          min_group_size?: number | null
          status?: Database["public"]["Enums"]["lifecycle_status"] | null
          updated_at?: string | null
          updated_by?: string | null
          valid_days_mask?: number | null
          valid_from: string
          valid_time_end?: string | null
          valid_time_start?: string | null
          valid_to: string
        }
        Update: {
          campaign_id?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          id?: string
          max_uses?: number | null
          min_group_size?: number | null
          status?: Database["public"]["Enums"]["lifecycle_status"] | null
          updated_at?: string | null
          updated_by?: string | null
          valid_days_mask?: number | null
          valid_from?: string
          valid_time_end?: string | null
          valid_time_start?: string | null
          valid_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_valid_tiers: {
        Row: {
          created_at: string
          promo_code_id: string
          tier_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          promo_code_id: string
          tier_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          promo_code_id?: string
          tier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_valid_tiers_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_valid_tiers_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      public_holidays: {
        Row: {
          created_at: string
          created_by: string | null
          holiday_date: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          holiday_date: string
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          holiday_date?: string
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          created_at: string
          expected_qty: number
          id: string
          material_id: string
          photo_proof_url: string | null
          po_id: string
          received_qty: number | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          expected_qty: number
          id?: string
          material_id: string
          photo_proof_url?: string | null
          po_id: string
          received_qty?: number | null
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          expected_qty?: number
          id?: string
          material_id?: string
          photo_proof_url?: string | null
          po_id?: string
          received_qty?: number | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_date: string | null
          receiving_location_id: string
          status: Database["public"]["Enums"]["po_status"] | null
          supplier_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          receiving_location_id: string
          status?: Database["public"]["Enums"]["po_status"] | null
          supplier_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          receiving_location_id?: string
          status?: Database["public"]["Enums"]["po_status"] | null
          supplier_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_receiving_location_id_fkey"
            columns: ["receiving_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_open_po_stats"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      report_executions: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          file_url: string | null
          id: string
          report_id: string
          row_count: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["report_status"] | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          file_url?: string | null
          id?: string
          report_id: string
          row_count?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["report_status"] | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          file_url?: string | null
          id?: string
          report_id?: string
          row_count?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["report_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_executions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          created_by: string | null
          export_format: string | null
          id: string
          is_active: boolean | null
          parameters: Json | null
          recipients: Json | null
          report_type: string
          schedule_cron: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          export_format?: string | null
          id?: string
          is_active?: boolean | null
          parameters?: Json | null
          recipients?: Json | null
          report_type: string
          schedule_cron?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          export_format?: string | null
          id?: string
          is_active?: boolean | null
          parameters?: Json | null
          recipients?: Json | null
          report_type?: string
          schedule_cron?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      role_domain_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_read: boolean
          can_update: boolean
          created_at: string
          created_by: string | null
          domain_id: string
          id: string
          role_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_read?: boolean
          can_update?: boolean
          created_at?: string
          created_by?: string | null
          domain_id: string
          id?: string
          role_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_read?: boolean
          can_update?: boolean
          created_at?: string
          created_by?: string | null
          domain_id?: string
          id?: string
          role_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_domain_permissions_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "permission_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_domain_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          access_level: Database["public"]["Enums"]["access_level"]
          created_at: string
          created_by: string | null
          display_name: string
          id: string
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          access_level: Database["public"]["Enums"]["access_level"]
          created_at?: string
          created_by?: string | null
          display_name: string
          id?: string
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          access_level?: Database["public"]["Enums"]["access_level"]
          created_at?: string
          created_by?: string | null
          display_name?: string
          id?: string
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      roster_template_shifts: {
        Row: {
          created_at: string
          created_by: string | null
          day_index: number
          id: string
          shift_type_id: string
          template_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          day_index: number
          id?: string
          shift_type_id: string
          template_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          day_index?: number
          id?: string
          shift_type_id?: string
          template_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roster_template_shifts_shift_type_id_fkey"
            columns: ["shift_type_id"]
            isOneToOne: false
            referencedRelation: "shift_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_template_shifts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "roster_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      roster_templates: {
        Row: {
          anchor_date: string
          created_at: string
          created_by: string | null
          cycle_length_days: number
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          anchor_date: string
          created_at?: string
          created_by?: string | null
          cycle_length_days: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          anchor_date?: string
          created_at?: string
          created_by?: string | null
          cycle_length_days?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      scheduler_config: {
        Row: {
          created_at: string
          day_end_hour: number
          day_start_hour: number
          days_ahead: number
          end_date: string | null
          experience_id: string
          start_date: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          day_end_hour?: number
          day_start_hour?: number
          days_ahead?: number
          end_date?: string | null
          experience_id: string
          start_date: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          day_end_hour?: number
          day_start_hour?: number
          days_ahead?: number
          end_date?: string | null
          experience_id?: string
          start_date?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduler_config_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: true
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          expected_end_time: string | null
          expected_start_time: string | null
          id: string
          is_override: boolean
          org_unit_path: unknown
          override_reason: string | null
          shift_date: string
          shift_type_id: string
          staff_record_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_end_time?: string | null
          expected_start_time?: string | null
          id?: string
          is_override?: boolean
          org_unit_path?: unknown
          override_reason?: string | null
          shift_date: string
          shift_type_id: string
          staff_record_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_end_time?: string | null
          expected_start_time?: string | null
          id?: string
          is_override?: boolean
          org_unit_path?: unknown
          override_reason?: string | null
          shift_date?: string
          shift_type_id?: string
          staff_record_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_schedules_shift_type_id_fkey"
            columns: ["shift_type_id"]
            isOneToOne: false
            referencedRelation: "shift_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_schedules_staff_record_id_fkey"
            columns: ["staff_record_id"]
            isOneToOne: false
            referencedRelation: "staff_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_schedules_staff_record_id_fkey"
            columns: ["staff_record_id"]
            isOneToOne: false
            referencedRelation: "v_staff_exception_stats"
            referencedColumns: ["staff_record_id"]
          },
        ]
      }
      shift_types: {
        Row: {
          break_duration_minutes: number
          code: string
          color: string | null
          created_at: string
          created_by: string | null
          end_time: string
          grace_early_departure_minutes: number
          grace_late_arrival_minutes: number
          id: string
          is_active: boolean
          max_early_clock_in_minutes: number
          max_late_clock_in_minutes: number
          max_late_clock_out_minutes: number
          name: string
          start_time: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          break_duration_minutes?: number
          code: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          end_time: string
          grace_early_departure_minutes?: number
          grace_late_arrival_minutes?: number
          id?: string
          is_active?: boolean
          max_early_clock_in_minutes?: number
          max_late_clock_in_minutes?: number
          max_late_clock_out_minutes?: number
          name: string
          start_time: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          break_duration_minutes?: number
          code?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          end_time?: string
          grace_early_departure_minutes?: number
          grace_late_arrival_minutes?: number
          id?: string
          is_active?: boolean
          max_early_clock_in_minutes?: number
          max_late_clock_in_minutes?: number
          max_late_clock_out_minutes?: number
          name?: string
          start_time?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      staff_records: {
        Row: {
          address: string | null
          bank_account_enc: string | null
          bank_name: string | null
          contract_end: string | null
          contract_start: string
          created_at: string
          created_by: string | null
          id: string
          kin_name: string | null
          kin_phone: string | null
          kin_relationship: string | null
          leave_policy_id: string | null
          legal_name: string
          national_id_enc: string | null
          org_unit_id: string | null
          org_unit_path: unknown
          personal_email: string
          phone: string | null
          salary_enc: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          bank_account_enc?: string | null
          bank_name?: string | null
          contract_end?: string | null
          contract_start: string
          created_at?: string
          created_by?: string | null
          id?: string
          kin_name?: string | null
          kin_phone?: string | null
          kin_relationship?: string | null
          leave_policy_id?: string | null
          legal_name: string
          national_id_enc?: string | null
          org_unit_id?: string | null
          org_unit_path?: unknown
          personal_email: string
          phone?: string | null
          salary_enc?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          bank_account_enc?: string | null
          bank_name?: string | null
          contract_end?: string | null
          contract_start?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kin_name?: string | null
          kin_phone?: string | null
          kin_relationship?: string | null
          leave_policy_id?: string | null
          legal_name?: string
          national_id_enc?: string | null
          org_unit_id?: string | null
          org_unit_path?: unknown
          personal_email?: string
          phone?: string | null
          salary_enc?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_records_leave_policy_id_fkey"
            columns: ["leave_policy_id"]
            isOneToOne: false
            referencedRelation: "leave_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_records_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_roster_assignments: {
        Row: {
          created_at: string
          created_by: string | null
          effective_end_date: string | null
          effective_start_date: string
          id: string
          org_unit_path: unknown
          roster_template_id: string
          staff_record_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_end_date?: string | null
          effective_start_date: string
          id?: string
          org_unit_path?: unknown
          roster_template_id: string
          staff_record_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_end_date?: string | null
          effective_start_date?: string
          id?: string
          org_unit_path?: unknown
          roster_template_id?: string
          staff_record_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_roster_assignments_roster_template_id_fkey"
            columns: ["roster_template_id"]
            isOneToOne: false
            referencedRelation: "roster_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_roster_assignments_staff_record_id_fkey"
            columns: ["staff_record_id"]
            isOneToOne: false
            referencedRelation: "staff_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_roster_assignments_staff_record_id_fkey"
            columns: ["staff_record_id"]
            isOneToOne: false
            referencedRelation: "v_staff_exception_stats"
            referencedColumns: ["staff_record_id"]
          },
        ]
      }
      stock_balance_cache: {
        Row: {
          created_at: string
          current_qty: number
          last_synced_at: string
          location_id: string
          material_id: string
          stock_value: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          current_qty?: number
          last_synced_at?: string
          location_id: string
          material_id: string
          stock_value?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          current_qty?: number
          last_synced_at?: string
          location_id?: string
          material_id?: string
          stock_value?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_balance_cache_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_balance_cache_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_bins: {
        Row: {
          bin_type: string | null
          capacity: number | null
          code: string
          created_at: string
          created_by: string | null
          id: string
          location_id: string
          name: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          bin_type?: string | null
          capacity?: number | null
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          location_id: string
          name?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          bin_type?: string | null
          capacity?: number | null
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string
          name?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storage_bins_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      survey_responses: {
        Row: {
          booking_id: string | null
          created_at: string
          feedback_text: string | null
          id: string
          keywords: Json | null
          nps_score: number | null
          overall_score: number | null
          sentiment: Database["public"]["Enums"]["survey_sentiment"] | null
          source: Database["public"]["Enums"]["survey_source"] | null
          staff_submitted: boolean
          submitted_by: string | null
          survey_type: Database["public"]["Enums"]["survey_type"]
          updated_at: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          feedback_text?: string | null
          id?: string
          keywords?: Json | null
          nps_score?: number | null
          overall_score?: number | null
          sentiment?: Database["public"]["Enums"]["survey_sentiment"] | null
          source?: Database["public"]["Enums"]["survey_source"] | null
          staff_submitted?: boolean
          submitted_by?: string | null
          survey_type: Database["public"]["Enums"]["survey_type"]
          updated_at?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          feedback_text?: string | null
          id?: string
          keywords?: Json | null
          nps_score?: number | null
          overall_score?: number | null
          sentiment?: Database["public"]["Enums"]["survey_sentiment"] | null
          source?: Database["public"]["Enums"]["survey_source"] | null
          staff_submitted?: boolean
          submitted_by?: string | null
          survey_type?: Database["public"]["Enums"]["survey_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      system_audit_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          performed_by: string | null
          updated_at: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string | null
          updated_at?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tier_perks: {
        Row: {
          created_at: string
          perk: string
          tier_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          perk: string
          tier_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          perk?: string
          tier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tier_perks_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      tiers: {
        Row: {
          adult_price: number
          child_price: number
          created_at: string
          created_by: string | null
          duration_minutes: number
          id: string
          name: string
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          adult_price: number
          child_price: number
          created_at?: string
          created_by?: string | null
          duration_minutes: number
          id?: string
          name: string
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          adult_price?: number
          child_price?: number
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          name?: string
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      time_slots: {
        Row: {
          booked_count: number | null
          constraint_notes: string | null
          constraint_type:
            | Database["public"]["Enums"]["slot_constraint_type"]
            | null
          created_at: string
          end_time: string
          experience_id: string
          id: string
          override_capacity: number | null
          slot_date: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          booked_count?: number | null
          constraint_notes?: string | null
          constraint_type?:
            | Database["public"]["Enums"]["slot_constraint_type"]
            | null
          created_at?: string
          end_time: string
          experience_id: string
          id?: string
          override_capacity?: number | null
          slot_date: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          booked_count?: number | null
          constraint_notes?: string | null
          constraint_type?:
            | Database["public"]["Enums"]["slot_constraint_type"]
            | null
          created_at?: string
          end_time?: string
          experience_id?: string
          id?: string
          override_capacity?: number | null
          slot_date?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_slots_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      timecard_punches: {
        Row: {
          created_at: string
          gps_coordinates: Json | null
          id: string
          org_unit_path: unknown
          punch_time: string
          punch_type: Database["public"]["Enums"]["punch_type"]
          remark: string | null
          selfie_url: string | null
          shift_schedule_id: string
          source: Database["public"]["Enums"]["punch_source"]
          staff_record_id: string
          updated_at: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          created_at?: string
          gps_coordinates?: Json | null
          id?: string
          org_unit_path?: unknown
          punch_time?: string
          punch_type: Database["public"]["Enums"]["punch_type"]
          remark?: string | null
          selfie_url?: string | null
          shift_schedule_id: string
          source?: Database["public"]["Enums"]["punch_source"]
          staff_record_id: string
          updated_at?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          created_at?: string
          gps_coordinates?: Json | null
          id?: string
          org_unit_path?: unknown
          punch_time?: string
          punch_type?: Database["public"]["Enums"]["punch_type"]
          remark?: string | null
          selfie_url?: string | null
          shift_schedule_id?: string
          source?: Database["public"]["Enums"]["punch_source"]
          staff_record_id?: string
          updated_at?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timecard_punches_shift_schedule_id_fkey"
            columns: ["shift_schedule_id"]
            isOneToOne: false
            referencedRelation: "shift_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timecard_punches_shift_schedule_id_fkey"
            columns: ["shift_schedule_id"]
            isOneToOne: false
            referencedRelation: "v_shift_attendance"
            referencedColumns: ["shift_schedule_id"]
          },
          {
            foreignKeyName: "timecard_punches_staff_record_id_fkey"
            columns: ["staff_record_id"]
            isOneToOne: false
            referencedRelation: "staff_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timecard_punches_staff_record_id_fkey"
            columns: ["staff_record_id"]
            isOneToOne: false
            referencedRelation: "v_staff_exception_stats"
            referencedColumns: ["staff_record_id"]
          },
        ]
      }
      units: {
        Row: {
          abbreviation: string
          created_at: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          abbreviation: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          abbreviation?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      uom_conversions: {
        Row: {
          created_at: string
          created_by: string | null
          factor: number
          from_unit_id: string
          id: string
          material_id: string | null
          to_unit_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          factor: number
          from_unit_id: string
          id?: string
          material_id?: string | null
          to_unit_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          factor?: number
          from_unit_id?: string
          id?: string
          material_id?: string | null
          to_unit_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uom_conversions_from_unit_id_fkey"
            columns: ["from_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uom_conversions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uom_conversions_to_unit_id_fkey"
            columns: ["to_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          plate: string | null
          status: Database["public"]["Enums"]["vehicle_status"] | null
          updated_at: string | null
          updated_by: string | null
          vehicle_type: string | null
          zone_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          plate?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"] | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_type?: string | null
          zone_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          plate?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"] | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_type?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      vlans: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: number
          name: string
          updated_at: string | null
          vlan_id: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: number
          name: string
          updated_at?: string | null
          vlan_id: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: number
          name?: string
          updated_at?: string | null
          vlan_id?: number
        }
        Relationships: []
      }
      write_offs: {
        Row: {
          bom_id: string | null
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          disposed_by: string | null
          explode_bom: boolean
          id: string
          location_id: string
          material_id: string
          notes: string | null
          photo_proof_url: string | null
          quantity: number
          reason: Database["public"]["Enums"]["disposal_reason"]
          reviewed_at: string | null
          reviewed_by: string | null
          total_cost: number | null
          unit_cost: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          bom_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          disposed_by?: string | null
          explode_bom: boolean
          id?: string
          location_id: string
          material_id: string
          notes?: string | null
          photo_proof_url?: string | null
          quantity: number
          reason: Database["public"]["Enums"]["disposal_reason"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          total_cost?: number | null
          unit_cost: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          bom_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          disposed_by?: string | null
          explode_bom?: boolean
          id?: string
          location_id?: string
          material_id?: string
          notes?: string | null
          photo_proof_url?: string | null
          quantity?: number
          reason?: Database["public"]["Enums"]["disposal_reason"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          total_cost?: number | null
          unit_cost?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "write_offs_bom_id_fkey"
            columns: ["bom_id"]
            isOneToOne: false
            referencedRelation: "bill_of_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "write_offs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "write_offs_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_telemetry: {
        Row: {
          co2_level: number | null
          created_at: string
          current_occupancy: number | null
          humidity: number | null
          id: string
          recorded_at: string | null
          temperature: number | null
          updated_at: string | null
          zone_id: string
        }
        Insert: {
          co2_level?: number | null
          created_at?: string
          current_occupancy?: number | null
          humidity?: number | null
          id?: string
          recorded_at?: string | null
          temperature?: number | null
          updated_at?: string | null
          zone_id: string
        }
        Update: {
          co2_level?: number | null
          created_at?: string
          current_occupancy?: number | null
          humidity?: number | null
          id?: string
          recorded_at?: string | null
          temperature?: number | null
          updated_at?: string | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_telemetry_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          capacity: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          location_id: string
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          capacity: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          location_id: string
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          capacity?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zones_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_daily_timecards: {
        Row: {
          clock_in_gps: Json | null
          clock_in_remark: string | null
          clock_in_selfie: string | null
          clock_in_source: Database["public"]["Enums"]["punch_source"] | null
          clock_out_gps: Json | null
          clock_out_remark: string | null
          clock_out_selfie: string | null
          clock_out_source: Database["public"]["Enums"]["punch_source"] | null
          first_in: string | null
          gross_worked_seconds: number | null
          last_out: string | null
          shift_schedule_id: string | null
          staff_record_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timecard_punches_shift_schedule_id_fkey"
            columns: ["shift_schedule_id"]
            isOneToOne: false
            referencedRelation: "shift_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timecard_punches_shift_schedule_id_fkey"
            columns: ["shift_schedule_id"]
            isOneToOne: false
            referencedRelation: "v_shift_attendance"
            referencedColumns: ["shift_schedule_id"]
          },
          {
            foreignKeyName: "timecard_punches_staff_record_id_fkey"
            columns: ["staff_record_id"]
            isOneToOne: false
            referencedRelation: "staff_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timecard_punches_staff_record_id_fkey"
            columns: ["staff_record_id"]
            isOneToOne: false
            referencedRelation: "v_staff_exception_stats"
            referencedColumns: ["staff_record_id"]
          },
        ]
      }
      v_leave_balances: {
        Row: {
          accrued_days: number | null
          adjustment_days: number | null
          balance: number | null
          carry_forward_days: number | null
          fiscal_year: number | null
          forfeiture_days: number | null
          is_paid: boolean | null
          leave_type_code: string | null
          leave_type_id: string | null
          leave_type_name: string | null
          staff_record_id: string | null
          used_days: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_ledger_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_ledger_staff_record_id_fkey"
            columns: ["staff_record_id"]
            isOneToOne: false
            referencedRelation: "staff_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_ledger_staff_record_id_fkey"
            columns: ["staff_record_id"]
            isOneToOne: false
            referencedRelation: "v_staff_exception_stats"
            referencedColumns: ["staff_record_id"]
          },
        ]
      }
      v_pos_point_today_stats: {
        Row: {
          last_order_at: string | null
          order_count_today: number | null
          pos_point_id: string | null
          revenue_today: number | null
        }
        Relationships: []
      }
      v_shift_attendance: {
        Row: {
          clock_in_gps: Json | null
          clock_in_remark: string | null
          clock_in_selfie: string | null
          clock_in_source: Database["public"]["Enums"]["punch_source"] | null
          clock_out_gps: Json | null
          clock_out_remark: string | null
          clock_out_selfie: string | null
          clock_out_source: Database["public"]["Enums"]["punch_source"] | null
          derived_status: string | null
          exception_types: string | null
          expected_end_time: string | null
          expected_net_seconds: number | null
          expected_start_time: string | null
          first_in: string | null
          gross_worked_seconds: number | null
          has_unjustified: boolean | null
          is_override: boolean | null
          last_out: string | null
          leave_is_paid: boolean | null
          leave_request_id: string | null
          leave_type_code: string | null
          leave_type_name: string | null
          net_worked_seconds: number | null
          override_reason: string | null
          public_holiday_id: string | null
          public_holiday_name: string | null
          shift_code: string | null
          shift_date: string | null
          shift_name: string | null
          shift_schedule_id: string | null
          shift_type_id: string | null
          staff_record_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_schedules_shift_type_id_fkey"
            columns: ["shift_type_id"]
            isOneToOne: false
            referencedRelation: "shift_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_schedules_staff_record_id_fkey"
            columns: ["staff_record_id"]
            isOneToOne: false
            referencedRelation: "staff_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_schedules_staff_record_id_fkey"
            columns: ["staff_record_id"]
            isOneToOne: false
            referencedRelation: "v_staff_exception_stats"
            referencedColumns: ["staff_record_id"]
          },
        ]
      }
      v_staff_exception_stats: {
        Row: {
          justified_count: number | null
          last_exception_at: string | null
          staff_record_id: string | null
          unjustified_count: number | null
          unjustified_last_30d: number | null
        }
        Relationships: []
      }
      v_stock_on_hand: {
        Row: {
          current_qty: number | null
          location_id: string | null
          material_id: string | null
          stock_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "goods_movement_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_movement_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      v_supplier_open_po_stats: {
        Row: {
          draft_po_count: number | null
          last_order_date: string | null
          open_po_count: number | null
          overdue_po_count: number | null
          supplier_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _report_booking_occupancy: { Args: { p_params: Json }; Returns: Json }
      _report_booking_summary: { Args: { p_params: Json }; Returns: Json }
      _report_daily_sales: { Args: { p_params: Json }; Returns: Json }
      _report_date_range: {
        Args: { p_params: Json }
        Returns: {
          range_end: string
          range_start: string
        }[]
      }
      _report_exception_report: { Args: { p_params: Json }; Returns: Json }
      _report_guest_satisfaction: { Args: { p_params: Json }; Returns: Json }
      _report_hourly_sales: { Args: { p_params: Json }; Returns: Json }
      _report_incident_summary: { Args: { p_params: Json }; Returns: Json }
      _report_inventory_movement: { Args: { p_params: Json }; Returns: Json }
      _report_leave_balance: { Args: { p_params: Json }; Returns: Json }
      _report_leave_usage: { Args: { p_params: Json }; Returns: Json }
      _report_low_stock_alert: { Args: { p_params: Json }; Returns: Json }
      _report_maintenance_summary: { Args: { p_params: Json }; Returns: Json }
      _report_monthly_attendance_summary: {
        Args: { p_params: Json }
        Returns: Json
      }
      _report_monthly_timesheet: { Args: { p_params: Json }; Returns: Json }
      _report_nps_summary: { Args: { p_params: Json }; Returns: Json }
      _report_purchase_order_summary: {
        Args: { p_params: Json }
        Returns: Json
      }
      _report_reconciliation_report: { Args: { p_params: Json }; Returns: Json }
      _report_revenue_by_experience: { Args: { p_params: Json }; Returns: Json }
      _report_sales_by_category: { Args: { p_params: Json }; Returns: Json }
      _report_sales_by_item: { Args: { p_params: Json }; Returns: Json }
      _report_sales_by_payment_method: {
        Args: { p_params: Json }
        Returns: Json
      }
      _report_staff_roster: { Args: { p_params: Json }; Returns: Json }
      _report_stock_level: { Args: { p_params: Json }; Returns: Json }
      _report_vehicle_status: { Args: { p_params: Json }; Returns: Json }
      _report_waste_report: { Args: { p_params: Json }; Returns: Json }
      admin_lock_account: {
        Args: { p_lock: boolean; p_reason?: string; p_target_user_id: string }
        Returns: undefined
      }
      computed_status: {
        Args: { mo: Database["public"]["Tables"]["maintenance_orders"]["Row"] }
        Returns: Database["public"]["Enums"]["mo_status"]
      }
      execute_nightly_attendance_sweep: { Args: never; Returns: undefined }
      execute_report: {
        Args: { p_params?: Json; p_report_type: string }
        Returns: Json
      }
      explode_bom: {
        Args: { p_depth?: number; p_material_id: string; p_quantity: number }
        Returns: {
          bom_id: string
          component_material_id: string
          component_qty: number
          depth: number
        }[]
      }
      fn_biometric_retention_sweep: { Args: never; Returns: number }
      fn_booking_status_sweep: { Args: never; Returns: Json }
      fn_generate_daily_slots: { Args: never; Returns: undefined }
      get_active_vendors_for_radius: {
        Args: never
        Returns: {
          network_group: string
          switch_port: string
          vendor_mac_address: unknown
        }[]
      }
      get_app_config: { Args: { p_key: string }; Returns: string }
      get_vault_secret: { Args: { p_name: string }; Returns: string }
      get_visible_announcements: {
        Args: { p_unread_only?: boolean }
        Returns: {
          content: string
          created_at: string
          created_by_name: string
          expires_at: string
          id: string
          is_read: boolean
          title: string
        }[]
      }
      is_claims_fresh: { Args: never; Returns: boolean }
      rpc_add_exception_clarification: {
        Args: { p_exception_id: string; p_text: string }
        Returns: undefined
      }
      rpc_apply_pattern_change: {
        Args: {
          p_force_all?: boolean
          p_from_date: string
          p_staff_record_ids?: string[]
          p_to_date: string
        }
        Returns: number
      }
      rpc_apply_payment_event: {
        Args: {
          p_event_id: string
          p_new_status: Database["public"]["Enums"]["payment_status"]
          p_paid_at?: string
          p_payment_intent: string
        }
        Returns: Json
      }
      rpc_cancel_leave_request: {
        Args: { p_leave_request_id: string }
        Returns: undefined
      }
      rpc_checkin_booking: { Args: { p_booking_id: string }; Returns: Json }
      rpc_clock_in: {
        Args: {
          p_gps?: Json
          p_remark?: string
          p_selfie_url?: string
          p_source?: Database["public"]["Enums"]["punch_source"]
        }
        Returns: Json
      }
      rpc_clock_out: {
        Args: {
          p_gps?: Json
          p_remark?: string
          p_selfie_url?: string
          p_source?: Database["public"]["Enums"]["punch_source"]
        }
        Returns: Json
      }
      rpc_confirm_password_set: { Args: never; Returns: undefined }
      rpc_confirm_slot_override: {
        Args: {
          p_constraint_notes?: string
          p_constraint_type?: Database["public"]["Enums"]["slot_constraint_type"]
          p_new_capacity: number
          p_slot_id: string
        }
        Returns: Json
      }
      rpc_convert_exception_to_leave: {
        Args: {
          p_days?: number
          p_exception_id: string
          p_leave_type_id: string
          p_note?: string
        }
        Returns: string
      }
      rpc_create_booking: {
        Args: {
          p_adult_count: number
          p_booker_email: string
          p_booker_name: string
          p_booker_phone: string
          p_child_count: number
          p_experience_id: string
          p_promo_code?: string
          p_tier_id: string
          p_time_slot_id: string
        }
        Returns: Json
      }
      rpc_erase_subject: {
        Args: { p_booking_id: string; p_reason?: string }
        Returns: Json
      }
      rpc_generate_schedules: {
        Args: { p_days_ahead?: number }
        Returns: number
      }
      rpc_generate_time_slots: {
        Args: {
          p_day_end_hour?: number
          p_day_start_hour?: number
          p_days: number
          p_experience_id: string
          p_slot_interval_minutes?: number
          p_start_date: string
        }
        Returns: Json
      }
      rpc_get_available_slots: {
        Args: {
          p_date: string
          p_experience_id: string
          p_guest_count: number
          p_tier_id: string
        }
        Returns: Json
      }
      rpc_get_booking_by_ref: { Args: { p_booking_ref: string }; Returns: Json }
      rpc_get_booking_identity: {
        Args: { p_booking_ref: string; p_ip_address?: unknown }
        Returns: Json
      }
      rpc_lookup_booking: {
        Args: { p_booking_ref?: string; p_qr_code_ref?: string }
        Returns: Json
      }
      rpc_mark_day_off: {
        Args: { p_date: string; p_name?: string }
        Returns: string
      }
      rpc_modify_booking: {
        Args: { p_booking_ref: string; p_new_time_slot_id: string }
        Returns: Json
      }
      rpc_preview_pattern_change: {
        Args: {
          p_from_date: string
          p_staff_record_ids?: string[]
          p_to_date: string
        }
        Returns: Json
      }
      rpc_preview_slot_override: {
        Args: { p_new_capacity: number; p_slot_id: string }
        Returns: {
          booking_id: string
          current_slot_date: string
          current_slot_id: string
          current_slot_time: string
          target_slot_date: string
          target_slot_id: string
          target_slot_time: string
        }[]
      }
      rpc_reorder_dashboard: {
        Args: never
        Returns: {
          category_id: string
          category_name: string
          cost_price: number
          default_supplier_id: string
          default_supplier_name: string
          effective_stock: number
          material_id: string
          material_name: string
          material_sku: string
          on_hand: number
          on_order: number
          purchase_unit_abbr: string
          reorder_amt: number
          reorder_point: number
          sell_through_30d: number
        }[]
      }
      rpc_request_recount: {
        Args: { p_new_runner_id?: string; p_reconciliation_id: string }
        Returns: undefined
      }
      rpc_run_monthly_accruals: { Args: never; Returns: number }
      rpc_search_bookings_by_email: { Args: { p_email: string }; Returns: Json }
      rpc_update_own_avatar: {
        Args: { p_avatar_url: string }
        Returns: undefined
      }
      rpc_validate_promo_code: {
        Args: {
          p_adult_count: number
          p_child_count: number
          p_promo_code: string
          p_slot_date: string
          p_slot_start_time: string
          p_tier_id: string
        }
        Returns: Json
      }
      rpc_verify_otp: {
        Args: { p_booking_ref: string; p_otp_code: string }
        Returns: Json
      }
      rpc_wipe_biometric_data: {
        Args: { p_booking_ref: string }
        Returns: Json
      }
      rpc_withdraw_biometric_consent: {
        Args: {
          p_actor_id?: string
          p_actor_type?: string
          p_attendee_id: string
          p_ip_address?: unknown
          p_user_agent?: string
        }
        Returns: Json
      }
      submit_pos_order: {
        Args: {
          p_items: Json
          p_payment_method: string
          p_pos_point_id: string
        }
        Returns: string
      }
    }
    Enums: {
      access_level: "admin" | "manager" | "crew"
      accrual_frequency: "annual_upfront" | "monthly_prorated"
      announcement_target_type: "global" | "role" | "org_unit" | "user"
      attendee_type: "adult" | "child"
      booking_status:
        | "pending_payment"
        | "confirmed"
        | "checked_in"
        | "completed"
        | "no_show"
        | "cancelled"
      device_status: "online" | "offline" | "maintenance" | "decommissioned"
      discount_type: "percentage" | "fixed"
      disposal_reason:
        | "expired"
        | "damaged"
        | "contaminated"
        | "preparation_error"
        | "overproduction"
        | "quality_defect"
      employment_status:
        | "active"
        | "pending"
        | "on_leave"
        | "suspended"
        | "terminated"
      exception_status: "unjustified" | "justified"
      exception_type:
        | "late_arrival"
        | "early_departure"
        | "missing_clock_in"
        | "missing_clock_out"
        | "absent"
      heartbeat_status: "online" | "offline" | "degraded"
      iam_request_status: "pending_it" | "approved" | "rejected"
      iam_request_type:
        | "provisioning"
        | "transfer"
        | "suspension"
        | "termination"
        | "reactivation"
      incident_category:
        | "fire"
        | "safety_hazard"
        | "biohazard"
        | "suspicious_package"
        | "spill"
        | "medical_emergency"
        | "heat_exhaustion"
        | "guest_injury"
        | "theft"
        | "vandalism"
        | "unauthorized_access"
        | "altercation"
        | "guest_complaint"
        | "lost_child"
        | "found_child"
        | "crowd_congestion"
        | "lost_property"
        | "found_property"
        | "other"
        | "structural"
        | "prop_damage"
        | "equipment_failure"
        | "pos_failure"
        | "hardware_failure"
        | "power_outage"
        | "network_outage"
      incident_status: "open" | "resolved"
      inventory_task_status:
        | "pending"
        | "in_progress"
        | "pending_review"
        | "completed"
        | "cancelled"
      leave_request_status: "pending" | "approved" | "rejected" | "cancelled"
      leave_transaction_type:
        | "accrual"
        | "usage"
        | "adjustment"
        | "carry_forward"
        | "forfeiture"
      lifecycle_status: "draft" | "active" | "paused" | "completed"
      material_type:
        | "raw"
        | "semi_finished"
        | "finished"
        | "trading"
        | "consumable"
        | "service"
      mo_status: "draft" | "scheduled" | "active" | "completed" | "cancelled"
      mo_topology: "remote" | "onsite"
      order_status: "preparing" | "completed" | "cancelled"
      payment_method: "card" | "face_pay" | "digital_wallet" | "cash"
      payment_status: "pending" | "success" | "failed" | "refunded"
      po_status:
        | "draft"
        | "sent"
        | "partially_received"
        | "completed"
        | "cancelled"
      punch_source: "mobile" | "kiosk" | "manual"
      punch_type: "clock_in" | "clock_out"
      report_status: "processing" | "completed" | "failed"
      slot_constraint_type:
        | "maintenance"
        | "private_event"
        | "safety_incident"
        | "weather"
        | "staffing"
        | "other"
      survey_sentiment: "positive" | "neutral" | "negative"
      survey_source: "in_app" | "email" | "kiosk" | "qr_code"
      survey_type:
        | "post_visit"
        | "nps"
        | "csat"
        | "exit_survey"
        | "staff_captured"
      vehicle_status: "active" | "maintenance" | "retired"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      access_level: ["admin", "manager", "crew"],
      accrual_frequency: ["annual_upfront", "monthly_prorated"],
      announcement_target_type: ["global", "role", "org_unit", "user"],
      attendee_type: ["adult", "child"],
      booking_status: [
        "pending_payment",
        "confirmed",
        "checked_in",
        "completed",
        "no_show",
        "cancelled",
      ],
      device_status: ["online", "offline", "maintenance", "decommissioned"],
      discount_type: ["percentage", "fixed"],
      disposal_reason: [
        "expired",
        "damaged",
        "contaminated",
        "preparation_error",
        "overproduction",
        "quality_defect",
      ],
      employment_status: [
        "active",
        "pending",
        "on_leave",
        "suspended",
        "terminated",
      ],
      exception_status: ["unjustified", "justified"],
      exception_type: [
        "late_arrival",
        "early_departure",
        "missing_clock_in",
        "missing_clock_out",
        "absent",
      ],
      heartbeat_status: ["online", "offline", "degraded"],
      iam_request_status: ["pending_it", "approved", "rejected"],
      iam_request_type: [
        "provisioning",
        "transfer",
        "suspension",
        "termination",
        "reactivation",
      ],
      incident_category: [
        "fire",
        "safety_hazard",
        "biohazard",
        "suspicious_package",
        "spill",
        "medical_emergency",
        "heat_exhaustion",
        "guest_injury",
        "theft",
        "vandalism",
        "unauthorized_access",
        "altercation",
        "guest_complaint",
        "lost_child",
        "found_child",
        "crowd_congestion",
        "lost_property",
        "found_property",
        "other",
        "structural",
        "prop_damage",
        "equipment_failure",
        "pos_failure",
        "hardware_failure",
        "power_outage",
        "network_outage",
      ],
      incident_status: ["open", "resolved"],
      inventory_task_status: [
        "pending",
        "in_progress",
        "pending_review",
        "completed",
        "cancelled",
      ],
      leave_request_status: ["pending", "approved", "rejected", "cancelled"],
      leave_transaction_type: [
        "accrual",
        "usage",
        "adjustment",
        "carry_forward",
        "forfeiture",
      ],
      lifecycle_status: ["draft", "active", "paused", "completed"],
      material_type: [
        "raw",
        "semi_finished",
        "finished",
        "trading",
        "consumable",
        "service",
      ],
      mo_status: ["draft", "scheduled", "active", "completed", "cancelled"],
      mo_topology: ["remote", "onsite"],
      order_status: ["preparing", "completed", "cancelled"],
      payment_method: ["card", "face_pay", "digital_wallet", "cash"],
      payment_status: ["pending", "success", "failed", "refunded"],
      po_status: [
        "draft",
        "sent",
        "partially_received",
        "completed",
        "cancelled",
      ],
      punch_source: ["mobile", "kiosk", "manual"],
      punch_type: ["clock_in", "clock_out"],
      report_status: ["processing", "completed", "failed"],
      slot_constraint_type: [
        "maintenance",
        "private_event",
        "safety_incident",
        "weather",
        "staffing",
        "other",
      ],
      survey_sentiment: ["positive", "neutral", "negative"],
      survey_source: ["in_app", "email", "kiosk", "qr_code"],
      survey_type: [
        "post_visit",
        "nps",
        "csat",
        "exit_survey",
        "staff_captured",
      ],
      vehicle_status: ["active", "maintenance", "retired"],
    },
  },
} as const
