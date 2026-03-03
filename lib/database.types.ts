/**
 * Типы Supabase (Postgres), сгенерированы по схеме проекта catalog.noema.
 * Обновить: плагин Supabase → generate_typescript_types, затем вставить сюда.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      brand: {
        Row: {
          business_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: Array<{
          foreignKeyName: "brand_business_id_fkey"
          columns: ["business_id"]
          isOneToOne: false
          referencedRelation: "business"
          referencedColumns: ["id"]
        }>
      }
      business: {
        Row: {
          city_delivery: string | null
          cover_url: string | null
          created_at: string | null
          delivery_regions: string | null
          delivery_types: string[] | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          promo_code: string | null
          promo_date_from: string | null
          promo_date_to: string | null
          promo_enabled: boolean
          promo_max_discount: number | null
          promo_min_order: number | null
          promo_type: string | null
          promo_value: number | null
          slug: string
          telegram: string | null
          theme_brand_foreground: string | null
          theme_brand_hsl: string | null
          updated_at: string | null
          whatsapp: string | null
          whatsapp_delivery: string | null
          whatsapp_dine_in: string | null
          whatsapp_pickup: string | null
          working_hours: string | null
        }
        Insert: {
          city_delivery?: string | null
          cover_url?: string | null
          created_at?: string | null
          delivery_regions?: string | null
          delivery_types?: string[] | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          promo_code?: string | null
          promo_date_from?: string | null
          promo_date_to?: string | null
          promo_enabled?: boolean
          promo_max_discount?: number | null
          promo_min_order?: number | null
          promo_type?: string | null
          promo_value?: number | null
          slug: string
          telegram?: string | null
          theme_brand_foreground?: string | null
          theme_brand_hsl?: string | null
          updated_at?: string | null
          whatsapp?: string | null
          whatsapp_delivery?: string | null
          whatsapp_dine_in?: string | null
          whatsapp_pickup?: string | null
          working_hours?: string | null
        }
        Update: {
          city_delivery?: string | null
          cover_url?: string | null
          created_at?: string | null
          delivery_regions?: string | null
          delivery_types?: string[] | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          promo_code?: string | null
          promo_date_from?: string | null
          promo_date_to?: string | null
          promo_enabled?: boolean
          promo_max_discount?: number | null
          promo_min_order?: number | null
          promo_type?: string | null
          promo_value?: number | null
          slug?: string
          telegram?: string | null
          theme_brand_foreground?: string | null
          theme_brand_hsl?: string | null
          updated_at?: string | null
          whatsapp?: string | null
          whatsapp_delivery?: string | null
          whatsapp_dine_in?: string | null
          whatsapp_pickup?: string | null
          working_hours?: string | null
        }
        Relationships: []
      }
      business_location: {
        Row: {
          address: string | null
          business_id: string
          created_at: string
          id: string
          is_active: boolean
          order_position: number
          phone: string | null
          telegram: string | null
          title: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          business_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          order_position?: number
          phone?: string | null
          telegram?: string | null
          title: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          business_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          order_position?: number
          phone?: string | null
          telegram?: string | null
          title?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: Array<{
          foreignKeyName: "business_location_business_id_fkey"
          columns: ["business_id"]
          isOneToOne: false
          referencedRelation: "business"
          referencedColumns: ["id"]
        }>
      }
      business_user: {
        Row: {
          business_id: string
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: Array<{
          foreignKeyName: "business_user_business_id_fkey"
          columns: ["business_id"]
          isOneToOne: false
          referencedRelation: "business"
          referencedColumns: ["id"]
        } | {
          foreignKeyName: "business_user_user_id_fkey"
          columns: ["user_id"]
          isOneToOne: false
          referencedRelation: "profile"
          referencedColumns: ["id"]
        }>
      }
      category: {
        Row: {
          business_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          order: number | null
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order?: number | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order?: number | null
          updated_at?: string | null
        }
        Relationships: Array<{
          foreignKeyName: "category_business_id_fkey"
          columns: ["business_id"]
          isOneToOne: false
          referencedRelation: "business"
          referencedColumns: ["id"]
        }>
      }
      product: {
        Row: {
          brand_id: string | null
          business_id: string | null
          category_id: string | null
          created_at: string | null
          description: string | null
          discount_date_from: string | null
          discount_date_to: string | null
          has_discount: boolean
          id: string
          images: string | null
          in_stock: boolean | null
          is_active: boolean | null
          name: string
          order: number
          original_price: number | null
          price: number
          subtitle: string | null
          updated_at: string | null
        }
        Insert: {
          brand_id?: string | null
          business_id?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          discount_date_from?: string | null
          discount_date_to?: string | null
          has_discount?: boolean
          id?: string
          images?: string | null
          in_stock?: boolean | null
          is_active?: boolean | null
          name: string
          order?: number
          original_price?: number | null
          price: number
          subtitle?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_id?: string | null
          business_id?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          discount_date_from?: string | null
          discount_date_to?: string | null
          has_discount?: boolean
          id?: string
          images?: string | null
          in_stock?: boolean | null
          is_active?: boolean | null
          name?: string
          order?: number
          original_price?: number | null
          price?: number
          subtitle?: string | null
          updated_at?: string | null
        }
        Relationships: Array<{
          foreignKeyName: "product_brand_id_fkey"
          columns: ["brand_id"]
          isOneToOne: false
          referencedRelation: "brand"
          referencedColumns: ["id"]
        } | {
          foreignKeyName: "product_business_id_fkey"
          columns: ["business_id"]
          isOneToOne: false
          referencedRelation: "business"
          referencedColumns: ["id"]
        } | {
          foreignKeyName: "product_category_id_fkey"
          columns: ["category_id"]
          isOneToOne: false
          referencedRelation: "category"
          referencedColumns: ["id"]
        }>
      }
      product_image: {
        Row: {
          created_at: string
          id: string
          position: number
          product_id: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          product_id: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          product_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: Array<{
          foreignKeyName: "product_image_product_id_fkey"
          columns: ["product_id"]
          isOneToOne: false
          referencedRelation: "product"
          referencedColumns: ["id"]
        }>
      }
      profile: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      check_business_user_access: { Args: Record<never, never>; Returns: boolean }
      reorder_products: {
        Args: { p_business_id: string; p_ordered_ids: string[] }
        Returns: undefined
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends { Row: infer R }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends { Row: infer R }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends { Insert: infer I }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends { Insert: infer I }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends { Update: infer U }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends { Update: infer U }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
