import json
from app import app, db
from models import BloodBank

def import_data_from_json():
    json_file_path = 'static/data/bloodbanks-india.min.json'

    with app.app_context():
        # Clear the table to prevent duplicates on re-runs
        db.session.query(BloodBank).delete()
        db.session.commit()
        print("Cleared existing blood bank data.")

        with open(json_file_path, mode='r', encoding='utf-8') as json_file:
            data = json.load(json_file)
        
        banks_to_add = []
        print(f"Reading {len(data)} records from JSON file...")

        for row in data:
            # Safely get values, defaulting to None if key is missing or value is "N/A" or ""
            def get_value(key):
                val = row.get(key)
                if val in ["N/A", ""]:
                    return None
                return val

            try:
                # --- FIX: Only skip a record if the 'Blood Bank Name' is missing.
                if not get_value('Blood Bank Name'):
                    continue

                # Coordinates can now be blank (None)
                latitude = float(row.get('Latitude')) if row.get('Latitude') else None
                longitude = float(row.get('Longitude')) if row.get('Longitude') else None
                
                bank = BloodBank(
                    name=get_value('Blood Bank Name'),
                    state=get_value('State'),
                    district=get_value('District'),
                    city=get_value('City'),
                    address=get_value('Address'),
                    pincode=str(get_value('Pincode') or ''),
                    contact_no=get_value('Contact No'),
                    mobile=str(get_value('Mobile') or ''),
                    helpline=get_value('Helpline'),
                    fax=get_value('Fax'),
                    email=get_value('Email'),
                    website=get_value('Website'),
                    nodal_officer=get_value('Nodal Officer'),
                    nodal_officer_contact=str(get_value('Contact Nodal Officer') or ''),
                    nodal_officer_mobile=str(get_value('Mobile Nodal Officer') or ''),
                    nodal_officer_email=get_value('Email Nodal Officer'),
                    nodal_officer_qualification=get_value('Qualification Nodal Officer'),
                    category=get_value('Category'),
                    blood_components_available=get_value('Blood Component Available'),
                    apheresis_available=get_value('Apheresis'),
                    service_time=get_value('Service Time'),
                    license_no=get_value('License #'),
                    license_obtain_date=get_value('Date License Obtained'),
                    renewal_date=get_value('Date of Renewal'),
                    latitude=latitude,
                    longitude=longitude
                )
                banks_to_add.append(bank)
            except (ValueError, TypeError) as e:
                print(f"Skipping a row due to data conversion error: {e}")

        print(f"Adding {len(banks_to_add)} valid blood banks to the database...")
        db.session.bulk_save_objects(banks_to_add)
        db.session.commit()
        print("JSON data import complete!")

if __name__ == '__main__':
    import_data_from_json()