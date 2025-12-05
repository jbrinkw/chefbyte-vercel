// Generated types for Supabase tables
// Based on supabase/migrations/001_initial_schema.sql

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      locations: {
        Row: {
          id: number
          user_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      quantity_units: {
        Row: {
          id: number
          user_id: string | null
          name: string
          name_plural: string | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id?: string | null
          name: string
          name_plural?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string | null
          name?: string
          name_plural?: string | null
          created_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: number
          user_id: string
          name: string
          description: string | null
          location_id: number | null
          qu_id_stock: number | null
          qu_id_purchase: number | null
          qu_id_consume: number | null
          qu_id_price: number | null
          min_stock_amount: number
          default_best_before_days: number
          calories_per_serving: number
          carbs_per_serving: number
          protein_per_serving: number
          fat_per_serving: number
          num_servings: number
          barcode: string | null
          walmart_link: string | null
          is_walmart: boolean
          is_meal_product: boolean
          is_placeholder: boolean
          price: number
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          name: string
          description?: string | null
          location_id?: number | null
          qu_id_stock?: number | null
          qu_id_purchase?: number | null
          qu_id_consume?: number | null
          qu_id_price?: number | null
          min_stock_amount?: number
          default_best_before_days?: number
          calories_per_serving?: number
          carbs_per_serving?: number
          protein_per_serving?: number
          fat_per_serving?: number
          num_servings?: number
          barcode?: string | null
          walmart_link?: string | null
          is_walmart?: boolean
          is_meal_product?: boolean
          is_placeholder?: boolean
          price?: number
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          name?: string
          description?: string | null
          location_id?: number | null
          qu_id_stock?: number | null
          qu_id_purchase?: number | null
          qu_id_consume?: number | null
          qu_id_price?: number | null
          min_stock_amount?: number
          default_best_before_days?: number
          calories_per_serving?: number
          carbs_per_serving?: number
          protein_per_serving?: number
          fat_per_serving?: number
          num_servings?: number
          barcode?: string | null
          walmart_link?: string | null
          is_walmart?: boolean
          is_meal_product?: boolean
          is_placeholder?: boolean
          price?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_location_id_fkey"
            columns: ["location_id"]
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_qu_id_stock_fkey"
            columns: ["qu_id_stock"]
            referencedRelation: "quantity_units"
            referencedColumns: ["id"]
          }
        ]
      }
      stock: {
        Row: {
          id: number
          user_id: string
          product_id: number
          amount: number
          best_before_date: string | null
          location_id: number | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          product_id: number
          amount: number
          best_before_date?: string | null
          location_id?: number | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          product_id?: number
          amount?: number
          best_before_date?: string | null
          location_id?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_location_id_fkey"
            columns: ["location_id"]
            referencedRelation: "locations"
            referencedColumns: ["id"]
          }
        ]
      }
      recipes: {
        Row: {
          id: number
          user_id: string
          name: string
          description: string | null
          base_servings: number
          total_time: number | null
          active_time: number | null
          calories: number | null
          carbs: number | null
          protein: number | null
          fat: number | null
          product_id: number | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          name: string
          description?: string | null
          base_servings?: number
          total_time?: number | null
          active_time?: number | null
          calories?: number | null
          carbs?: number | null
          protein?: number | null
          fat?: number | null
          product_id?: number | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          name?: string
          description?: string | null
          base_servings?: number
          total_time?: number | null
          active_time?: number | null
          calories?: number | null
          carbs?: number | null
          protein?: number | null
          fat?: number | null
          product_id?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      recipe_ingredients: {
        Row: {
          id: number
          user_id: string
          recipe_id: number
          product_id: number
          amount: number
          qu_id: number | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          recipe_id: number
          product_id: number
          amount: number
          qu_id?: number | null
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          recipe_id?: number
          product_id?: number
          amount?: number
          qu_id?: number | null
          note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      meal_plan: {
        Row: {
          id: number
          user_id: string
          day: string
          type: 'recipe' | 'product'
          recipe_id: number | null
          product_id: number | null
          amount: number
          qu_id: number | null
          done: boolean
          is_meal_prep: boolean
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          day: string
          type: 'recipe' | 'product'
          recipe_id?: number | null
          product_id?: number | null
          amount?: number
          qu_id?: number | null
          done?: boolean
          is_meal_prep?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          day?: string
          type?: 'recipe' | 'product'
          recipe_id?: number | null
          product_id?: number | null
          amount?: number
          qu_id?: number | null
          done?: boolean
          is_meal_prep?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_recipe_id_fkey"
            columns: ["recipe_id"]
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      shopping_list: {
        Row: {
          id: number
          user_id: string
          product_id: number
          amount: number
          note: string | null
          done: boolean
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          product_id: number
          amount: number
          note?: string | null
          done?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          product_id?: number
          amount?: number
          note?: string | null
          done?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      quantity_unit_conversions: {
        Row: {
          id: number
          user_id: string
          product_id: number | null
          from_qu_id: number
          to_qu_id: number
          factor: number
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          product_id?: number | null
          from_qu_id: number
          to_qu_id: number
          factor: number
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          product_id?: number | null
          from_qu_id?: number
          to_qu_id?: number
          factor?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quantity_unit_conversions_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quantity_unit_conversions_from_qu_id_fkey"
            columns: ["from_qu_id"]
            referencedRelation: "quantity_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quantity_unit_conversions_to_qu_id_fkey"
            columns: ["to_qu_id"]
            referencedRelation: "quantity_units"
            referencedColumns: ["id"]
          }
        ]
      }
      stock_log: {
        Row: {
          id: number
          user_id: string
          product_id: number
          amount: number
          best_before_date: string | null
          purchased_date: string | null
          stock_id: number | null
          transaction_type: string | null
          timestamp: string
        }
        Insert: {
          id?: number
          user_id: string
          product_id: number
          amount: number
          best_before_date?: string | null
          purchased_date?: string | null
          stock_id?: number | null
          transaction_type?: string | null
          timestamp?: string
        }
        Update: {
          id?: number
          user_id?: string
          product_id?: number
          amount?: number
          best_before_date?: string | null
          purchased_date?: string | null
          stock_id?: number | null
          transaction_type?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_log_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_log_stock_id_fkey"
            columns: ["stock_id"]
            referencedRelation: "stock"
            referencedColumns: ["id"]
          }
        ]
      }
      user_config: {
        Row: {
          id: number
          user_id: string
          key: string
          value: string
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          key: string
          value: string
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          key?: string
          value?: string
          created_at?: string
        }
        Relationships: []
      }
      temp_items: {
        Row: {
          id: number
          user_id: string
          name: string
          calories: number
          carbs: number
          protein: number
          fat: number
          day: string
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          name: string
          calories?: number
          carbs?: number
          protein?: number
          fat?: number
          day: string
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          name?: string
          calories?: number
          carbs?: number
          protein?: number
          fat?: number
          day?: string
          created_at?: string
        }
        Relationships: []
      }
      device_keys: {
        Row: {
          id: string
          user_id: string
          key_hash: string
          name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          key_hash: string
          name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          key_hash?: string
          name?: string | null
          created_at?: string
        }
        Relationships: []
      }
      liquid_events: {
        Row: {
          id: number
          user_id: string
          scale_id: string
          timestamp: number
          weight_before: number
          weight_after: number
          consumed: number
          is_refill: boolean
          product_name: string
          calories: number
          protein: number
          carbs: number
          fat: number
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          scale_id: string
          timestamp: number
          weight_before: number
          weight_after: number
          consumed: number
          is_refill?: boolean
          product_name: string
          calories?: number
          protein?: number
          carbs?: number
          fat?: number
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          scale_id?: string
          timestamp?: number
          weight_before?: number
          weight_after?: number
          consumed?: number
          is_refill?: boolean
          product_name?: string
          calories?: number
          protein?: number
          carbs?: number
          fat?: number
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      demo_reset: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
