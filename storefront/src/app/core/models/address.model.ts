export interface Address {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface AddressFormData {
  name: string;
  phone: string;
  line1: string;
  // null (not undefined) is sent to explicitly CLEAR an optional field on edit —
  // `|| undefined` would drop the key and the backend would keep the old value.
  line2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}
