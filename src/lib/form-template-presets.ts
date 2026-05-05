import type { DynamicQuestionType } from "@/lib/dynamic-forms";

export interface FormTemplatePresetQuestion {
  key: string;
  label: string;
  type: DynamicQuestionType;
  required: boolean;
  helpText?: string;
  options?: string[];
}

export interface FormTemplatePreset {
  id: string;
  name: string;
  description: string;
  questions: FormTemplatePresetQuestion[];
}

export const FORM_TEMPLATE_PRESETS: FormTemplatePreset[] = [
  {
    id: "purchased-vehicle-delivery-checklist",
    name: "Purchased Vehicle Delivery Checklist",
    description:
      "Checklist for delivering a purchased vehicle to the customer.",
    questions: [
      {
        key: "liquid_kit_or_spare_wheel_tools",
        label: "Liquid kit or spare wheel & tools",
        type: "boolean",
        required: true,
      },
      {
        key: "spare_key",
        label: "Spare key",
        type: "boolean",
        required: true,
      },
      {
        key: "locking_wheel_nut",
        label: "Locking wheel nut",
        type: "boolean",
        required: true,
      },
      {
        key: "mats",
        label: "Mats",
        type: "boolean",
        required: true,
      },
      {
        key: "load_cover_parcel_shelf",
        label: "Load cover (parcel shelf)",
        type: "boolean",
        required: true,
      },
      {
        key: "paperwork_sales_envelope_v5_vehicle_photo",
        label:
          "Paperwork / sales envelope, including V5, photo of the vehicle",
        type: "boolean",
        required: true,
      },
    ],
  },
  {
    id: "purchase-delivery-confirmation",
    name: "Vehicle Purchase & Delivery Confirmation",
    description:
      "For when a customer buys a vehicle and it is delivered to their address.",
    questions: [
      {
        key: "buyer_full_name",
        label: "Buyer full name",
        type: "text",
        required: true,
      },
      {
        key: "order_reference",
        label: "Order reference",
        type: "text",
        required: true,
      },
      {
        key: "delivery_date",
        label: "Delivery date",
        type: "date",
        required: true,
      },
      {
        key: "delivery_address",
        label: "Delivery address",
        type: "textarea",
        required: true,
      },
      {
        key: "vehicle_registration",
        label: "Vehicle registration",
        type: "text",
        required: true,
      },
      {
        key: "vehicle_make_model",
        label: "Vehicle make and model",
        type: "text",
        required: true,
      },
      {
        key: "mileage_at_delivery",
        label: "Mileage at delivery",
        type: "number",
        required: true,
      },
      {
        key: "keys_handed_over",
        label: "Keys handed over",
        type: "number",
        required: true,
      },
      {
        key: "documents_handed_over",
        label: "Documents handed over",
        type: "multi_select",
        required: true,
        options: ["V5C", "Service history", "Warranty booklet", "MOT certificate"],
      },
      {
        key: "customer_accepted_condition",
        label: "Customer confirms vehicle condition is accepted",
        type: "boolean",
        required: true,
      },
      {
        key: "delivery_photos",
        label: "Delivery photos",
        type: "photo",
        required: false,
      },
      {
        key: "delivery_notes",
        label: "Delivery notes",
        type: "textarea",
        required: false,
      },
      {
        key: "customer_signature_delivery",
        label: "Customer signature",
        type: "signature",
        required: true,
      },
    ],
  },
  {
    id: "retail-delivery",
    name: "Retail Vehicle Delivery",
    description: "Standard customer handover for retail vehicle sales.",
    questions: [
      { key: "customer_full_name", label: "Customer full name", type: "text", required: true },
      { key: "vehicle_registration", label: "Vehicle registration", type: "text", required: true },
      { key: "vehicle_mileage", label: "Vehicle mileage", type: "number", required: true },
      { key: "keys_handed_over", label: "Number of keys handed over", type: "number", required: true },
      { key: "documents_given", label: "Documents provided", type: "multi_select", required: true, options: ["V5C", "Service book", "Warranty", "MOT certificate"] },
      { key: "demo_completed", label: "Vehicle controls demonstrated", type: "boolean", required: true },
      { key: "customer_questions", label: "Customer questions answered", type: "textarea", required: false },
      { key: "customer_signature", label: "Customer signature", type: "signature", required: true },
    ],
  },
  {
    id: "used-car-sales",
    name: "Used Car Sales Handover",
    description: "Handover checklist for approved used vehicles.",
    questions: [
      { key: "buyer_name", label: "Buyer name", type: "text", required: true },
      { key: "sale_date", label: "Sale date", type: "date", required: true },
      { key: "registration", label: "Vehicle registration", type: "text", required: true },
      { key: "fuel_level", label: "Fuel level at handover", type: "single_select", required: true, options: ["Empty", "Quarter", "Half", "Three quarters", "Full"] },
      { key: "service_status", label: "Service status", type: "single_select", required: true, options: ["Just serviced", "Service due soon", "Service overdue"] },
      { key: "minor_damage_noted", label: "Any minor damage noted?", type: "boolean", required: true },
      { key: "damage_notes", label: "Damage notes", type: "textarea", required: false },
      { key: "handover_photo", label: "Vehicle photo at handover", type: "photo", required: false },
      { key: "buyer_signature", label: "Buyer signature", type: "signature", required: true },
    ],
  },
  {
    id: "trade-sale-release",
    name: "Trade Sale / Auction Release",
    description: "Release form for trade buyers or auction transfer.",
    questions: [
      { key: "buyer_company", label: "Buyer company name", type: "text", required: true },
      { key: "contact_name", label: "Contact person", type: "text", required: true },
      { key: "vehicle_reg", label: "Vehicle registration", type: "text", required: true },
      { key: "sale_type", label: "Sale type", type: "single_select", required: true, options: ["Trade", "Auction"] },
      { key: "sold_as_seen", label: "Sold as seen acknowledged", type: "boolean", required: true },
      { key: "known_faults", label: "Known faults declared", type: "textarea", required: false },
      { key: "keys_provided", label: "Keys provided", type: "number", required: true },
      { key: "release_signature", label: "Receiver signature", type: "signature", required: true },
    ],
  },
  {
    id: "service-loan-car",
    name: "Service Loan Car Handover",
    description: "Loan/courtesy vehicle issue form from workshop.",
    questions: [
      { key: "driver_name", label: "Driver name", type: "text", required: true },
      { key: "driver_license_checked", label: "Driving licence checked", type: "boolean", required: true },
      { key: "loan_vehicle_reg", label: "Loan vehicle registration", type: "text", required: true },
      { key: "loan_start_date", label: "Loan start date", type: "date", required: true },
      { key: "expected_return_date", label: "Expected return date", type: "date", required: true },
      { key: "fuel_level_out", label: "Fuel level on issue", type: "single_select", required: true, options: ["Empty", "Quarter", "Half", "Three quarters", "Full"] },
      { key: "pre_existing_damage", label: "Pre-existing damage notes", type: "textarea", required: false },
      { key: "vehicle_issue_photos", label: "Issue photos", type: "photo", required: false },
      { key: "driver_signature", label: "Driver signature", type: "signature", required: true },
    ],
  },
  {
    id: "test-drive",
    name: "Test Drive Liability Form",
    description: "Customer test drive terms and vehicle condition record.",
    questions: [
      { key: "customer_name", label: "Customer name", type: "text", required: true },
      { key: "license_number", label: "Driving licence number", type: "text", required: true },
      { key: "license_expiry", label: "Licence expiry date", type: "date", required: true },
      { key: "vehicle_reg_td", label: "Vehicle registration", type: "text", required: true },
      { key: "test_drive_route", label: "Test drive route", type: "textarea", required: false },
      { key: "insurance_confirmed", label: "Insurance / policy confirmed", type: "boolean", required: true },
      { key: "damage_before_drive", label: "Damage before test drive", type: "textarea", required: false },
      { key: "damage_after_drive", label: "Damage after test drive", type: "textarea", required: false },
      { key: "customer_signature_td", label: "Customer signature", type: "signature", required: true },
    ],
  },
  {
    id: "vehicle-collection",
    name: "Vehicle Collection from Customer",
    description: "Collection checklist when taking a vehicle from a customer.",
    questions: [
      { key: "customer_name_collect", label: "Customer name", type: "text", required: true },
      { key: "collection_address", label: "Collection address", type: "textarea", required: true },
      { key: "vehicle_reg_collect", label: "Vehicle registration", type: "text", required: true },
      { key: "mileage_collect", label: "Mileage at collection", type: "number", required: true },
      { key: "keys_received", label: "Number of keys received", type: "number", required: true },
      { key: "docs_received", label: "Documents received", type: "multi_select", required: false, options: ["V5C", "Service records", "MOT", "Manuals"] },
      { key: "collection_photos", label: "Collection photos", type: "photo", required: false },
      { key: "collector_notes", label: "Collector notes", type: "textarea", required: false },
      { key: "customer_signature_collect", label: "Customer signature", type: "signature", required: true },
    ],
  },
  {
    id: "part-exchange",
    name: "Part Exchange Appraisal Handover",
    description: "Part exchange intake and condition acceptance.",
    questions: [
      { key: "customer_name_px", label: "Customer name", type: "text", required: true },
      { key: "px_vehicle_reg", label: "Part exchange registration", type: "text", required: true },
      { key: "px_make_model", label: "Make and model", type: "text", required: true },
      { key: "px_mileage", label: "Mileage", type: "number", required: true },
      { key: "warning_lights", label: "Any warning lights present", type: "boolean", required: true },
      { key: "service_history_level", label: "Service history level", type: "single_select", required: true, options: ["Full", "Partial", "None", "Unknown"] },
      { key: "valuation_notes", label: "Valuation notes", type: "textarea", required: false },
      { key: "px_photos", label: "Part exchange photos", type: "photo", required: false },
      { key: "customer_signature_px", label: "Customer signature", type: "signature", required: true },
    ],
  },
  {
    id: "fleet-allocation",
    name: "Fleet Vehicle Driver Allocation",
    description: "Business fleet vehicle handover to a named driver.",
    questions: [
      { key: "driver_full_name", label: "Driver full name", type: "text", required: true },
      { key: "department", label: "Department / team", type: "text", required: true },
      { key: "fleet_vehicle_reg", label: "Vehicle registration", type: "text", required: true },
      { key: "allocation_date", label: "Allocation date", type: "date", required: true },
      { key: "odometer_out", label: "Odometer at handover", type: "number", required: true },
      { key: "equipment_issued", label: "Equipment issued", type: "multi_select", required: false, options: ["Fuel card", "Telematics tag", "Charging cable", "Emergency kit"] },
      { key: "policy_briefing_done", label: "Driver policy briefing completed", type: "boolean", required: true },
      { key: "driver_signature_fleet", label: "Driver signature", type: "signature", required: true },
    ],
  },
  {
    id: "lease-return",
    name: "Lease Vehicle Return Inspection",
    description: "Inspection form for leased vehicle returns.",
    questions: [
      { key: "return_driver_name", label: "Returning driver name", type: "text", required: true },
      { key: "return_date", label: "Return date", type: "date", required: true },
      { key: "lease_vehicle_reg", label: "Vehicle registration", type: "text", required: true },
      { key: "odometer_return", label: "Odometer reading", type: "number", required: true },
      { key: "fuel_level_return", label: "Fuel level on return", type: "single_select", required: true, options: ["Empty", "Quarter", "Half", "Three quarters", "Full"] },
      { key: "damage_found", label: "Damage found on return", type: "boolean", required: true },
      { key: "damage_details_return", label: "Damage details", type: "textarea", required: false },
      { key: "return_photos", label: "Return condition photos", type: "photo", required: false },
      { key: "inspector_signature", label: "Inspector signature", type: "signature", required: true },
    ],
  },
  {
    id: "courtesy-return",
    name: "Courtesy Car Return",
    description: "Quick return checklist for courtesy vehicles.",
    questions: [
      { key: "customer_name_return", label: "Customer name", type: "text", required: true },
      { key: "courtesy_reg", label: "Courtesy car registration", type: "text", required: true },
      { key: "return_time", label: "Return date", type: "date", required: true },
      { key: "mileage_in", label: "Mileage on return", type: "number", required: true },
      { key: "fuel_matched", label: "Fuel level matched issue level", type: "boolean", required: true },
      { key: "new_damage", label: "Any new damage", type: "boolean", required: true },
      { key: "damage_notes_return", label: "Damage notes", type: "textarea", required: false },
      { key: "return_signature_customer", label: "Customer signature", type: "signature", required: true },
    ],
  },
];
