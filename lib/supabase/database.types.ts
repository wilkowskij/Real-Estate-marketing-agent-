// Generated from the live Supabase schema via `generate_typescript_types`.
// Regenerate after any migration. Do not edit by hand.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_runs: {
        Row: {
          agent: string
          cost_usd: number | null
          created_at: string
          id: string
          input: Json | null
          input_tokens: number | null
          org_id: string | null
          output: Json | null
          output_tokens: number | null
          tool_calls: Json | null
        }
        Insert: {
          agent: string
          cost_usd?: number | null
          created_at?: string
          id?: string
          input?: Json | null
          input_tokens?: number | null
          org_id?: string | null
          output?: Json | null
          output_tokens?: number | null
          tool_calls?: Json | null
        }
        Update: {
          agent?: string
          cost_usd?: number | null
          created_at?: string
          id?: string
          input?: Json | null
          input_tokens?: number | null
          org_id?: string | null
          output?: Json | null
          output_tokens?: number | null
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          created_at: string
          height: number | null
          id: string
          kind: string
          listing_id: string | null
          meta: Json
          org_id: string
          storage_path: string
          width: number | null
        }
        Insert: {
          created_at?: string
          height?: number | null
          id?: string
          kind?: string
          listing_id?: string | null
          meta?: Json
          org_id: string
          storage_path: string
          width?: number | null
        }
        Update: {
          created_at?: string
          height?: number | null
          id?: string
          kind?: string
          listing_id?: string | null
          meta?: Json
          org_id?: string
          storage_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kits: {
        Row: {
          colors: Json
          created_at: string
          disclaimer: string | null
          fonts: Json
          id: string
          is_default: boolean
          layout_theme: string
          locked_fields: string[]
          logo_dark_path: string | null
          logo_light_path: string | null
          membership_id: string | null
          name: string
          org_id: string
          owner: Database["public"]["Enums"]["brand_owner"]
        }
        Insert: {
          colors?: Json
          created_at?: string
          disclaimer?: string | null
          fonts?: Json
          id?: string
          is_default?: boolean
          layout_theme?: string
          locked_fields?: string[]
          logo_dark_path?: string | null
          logo_light_path?: string | null
          membership_id?: string | null
          name?: string
          org_id: string
          owner: Database["public"]["Enums"]["brand_owner"]
        }
        Update: {
          colors?: Json
          created_at?: string
          disclaimer?: string | null
          fonts?: Json
          id?: string
          is_default?: boolean
          layout_theme?: string
          locked_fields?: string[]
          logo_dark_path?: string | null
          logo_light_path?: string | null
          membership_id?: string | null
          name?: string
          org_id?: string
          owner?: Database["public"]["Enums"]["brand_owner"]
        }
        Relationships: [
          {
            foreignKeyName: "brand_kits_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_kits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          brand_kit_id: string | null
          copy: Json
          created_at: string
          created_by: string
          id: string
          listing_id: string | null
          org_id: string
          rendered_asset_id: string | null
          status: string
          type: Database["public"]["Enums"]["campaign_type"]
        }
        Insert: {
          brand_kit_id?: string | null
          copy?: Json
          created_at?: string
          created_by: string
          id?: string
          listing_id?: string | null
          org_id: string
          rendered_asset_id?: string | null
          status?: string
          type: Database["public"]["Enums"]["campaign_type"]
        }
        Update: {
          brand_kit_id?: string | null
          copy?: Json
          created_at?: string
          created_by?: string
          id?: string
          listing_id?: string | null
          org_id?: string
          rendered_asset_id?: string | null
          status?: string
          type?: Database["public"]["Enums"]["campaign_type"]
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_rendered_asset_id_fkey"
            columns: ["rendered_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          address: string
          baths: number | null
          beds: number | null
          county: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          org_id: string
          price: number | null
          sqft: number | null
          state: string
          status: Database["public"]["Enums"]["listing_status"]
          town: string | null
        }
        Insert: {
          address: string
          baths?: number | null
          beds?: number | null
          county?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          org_id: string
          price?: number | null
          sqft?: number | null
          state?: string
          status?: Database["public"]["Enums"]["listing_status"]
          town?: string | null
        }
        Update: {
          address?: string
          baths?: number | null
          beds?: number | null
          county?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          org_id?: string
          price?: number | null
          sqft?: number | null
          state?: string
          status?: Database["public"]["Enums"]["listing_status"]
          town?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          created_at: string
          id: string
          is_solo: boolean
          name: string
          plan: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_solo?: boolean
          name: string
          plan?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_solo?: boolean
          name?: string
          plan?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          campaign_id: string | null
          caption: string | null
          created_at: string
          error: string | null
          id: string
          media_paths: string[]
          org_id: string
          platform: string
          platform_post_id: string | null
          scheduled_at: string | null
          state: Database["public"]["Enums"]["post_state"]
        }
        Insert: {
          campaign_id?: string | null
          caption?: string | null
          created_at?: string
          error?: string | null
          id?: string
          media_paths?: string[]
          org_id: string
          platform: string
          platform_post_id?: string | null
          scheduled_at?: string | null
          state?: Database["public"]["Enums"]["post_state"]
        }
        Update: {
          campaign_id?: string | null
          caption?: string | null
          created_at?: string
          error?: string | null
          id?: string
          media_paths?: string[]
          org_id?: string
          platform?: string
          platform_post_id?: string | null
          scheduled_at?: string | null
          state?: Database["public"]["Enums"]["post_state"]
        }
        Relationships: [
          {
            foreignKeyName: "posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          contact_block: Json
          created_at: string
          full_name: string | null
          headshot_path: string | null
          license_number: string | null
          user_id: string
        }
        Insert: {
          contact_block?: Json
          created_at?: string
          full_name?: string | null
          headshot_path?: string | null
          license_number?: string | null
          user_id: string
        }
        Update: {
          contact_block?: Json
          created_at?: string
          full_name?: string | null
          headshot_path?: string | null
          license_number?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recurring_jobs: {
        Row: {
          auto_publish: boolean
          cadence: string
          config: Json
          created_at: string
          enabled: boolean
          id: string
          kind: string
          last_run_at: string | null
          org_id: string
        }
        Insert: {
          auto_publish?: boolean
          cadence?: string
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          kind: string
          last_run_at?: string | null
          org_id: string
        }
        Update: {
          auto_publish?: boolean
          cadence?: string
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          kind?: string
          last_run_at?: string | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      social_accounts: {
        Row: {
          access_token_enc: string | null
          account_label: string | null
          created_at: string
          expires_at: string | null
          id: string
          membership_id: string | null
          meta: Json
          org_id: string
          owner: Database["public"]["Enums"]["brand_owner"]
          platform: string
          refresh_token_enc: string | null
        }
        Insert: {
          access_token_enc?: string | null
          account_label?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          membership_id?: string | null
          meta?: Json
          org_id: string
          owner?: Database["public"]["Enums"]["brand_owner"]
          platform: string
          refresh_token_enc?: string | null
        }
        Update: {
          access_token_enc?: string | null
          account_label?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          membership_id?: string | null
          meta?: Json
          org_id?: string
          owner?: Database["public"]["Enums"]["brand_owner"]
          platform?: string
          refresh_token_enc?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_accounts_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      trends: {
        Row: {
          created_at: string
          id: string
          org_id: string | null
          payload: Json
          relevance: number | null
          source: string | null
          topic: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id?: string | null
          payload?: Json
          relevance?: number | null
          source?: string | null
          topic: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string | null
          payload?: Json
          relevance?: number | null
          source?: string | null
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "trends_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_org_admin: { Args: { target_org: string }; Returns: boolean }
      is_org_member: { Args: { target_org: string }; Returns: boolean }
    }
    Enums: {
      brand_owner: "org" | "member"
      campaign_type: "just_sold" | "new_listing" | "open_house" | "custom"
      listing_status: "active" | "pending" | "sold" | "coming_soon"
      member_role: "owner" | "admin" | "member"
      post_state: "draft" | "approved" | "scheduled" | "published" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
