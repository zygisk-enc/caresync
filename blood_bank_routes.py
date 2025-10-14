from flask import Blueprint, render_template, session, redirect, url_for, request, jsonify
from models import BloodBank
from sqlalchemy import func, or_
from math import radians, cos, sin, asin, sqrt

blood_bank = Blueprint('blood_bank', __name__)

def haversine(lat1, lon1, lat2, lon2):
    """ Calculate the distance between two points on Earth in kilometers. """
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    r = 6371 # Radius of earth in kilometers.
    return c * r

@blood_bank.route('/blood-banks')
def list_page():
    if 'user_id' not in session and 'doctor_id' not in session:
        return redirect(url_for('auth.login'))
    return render_template('blood_banks.html')

# In blood_bank_routes.py

@blood_bank.route('/api/blood-banks')
def get_blood_banks():
    if 'user_id' not in session and 'doctor_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    search_term = request.args.get('search', '').lower()
    user_lat = request.args.get('lat', type=float)
    user_lng = request.args.get('lng', type=float)
    
    query = BloodBank.query

    if search_term:
        query = query.filter(or_(
            func.lower(BloodBank.name).contains(search_term),
            func.lower(BloodBank.city).contains(search_term),
            func.lower(BloodBank.district).contains(search_term),
            func.lower(BloodBank.state).contains(search_term)
        ))

    all_banks = query.all()
    
    results = []
    for bank in all_banks:
        # --- MODIFIED: Include all fields from the database ---
        bank_data = {
            'id': bank.id,
            'name': bank.name,
            'state': bank.state,
            'district': bank.district,
            'city': bank.city,
            'address': bank.address,
            'pincode': bank.pincode,
            'contact_no': bank.contact_no,
            'mobile': bank.mobile,
            'helpline': bank.helpline,
            'fax': bank.fax,
            'email': bank.email,
            'website': bank.website,
            'nodal_officer': bank.nodal_officer,
            'nodal_officer_contact': bank.nodal_officer_contact,
            'nodal_officer_mobile': bank.nodal_officer_mobile,
            'nodal_officer_email': bank.nodal_officer_email,
            'nodal_officer_qualification': bank.nodal_officer_qualification,
            'category': bank.category,
            'blood_components_available': bank.blood_components_available,
            'apheresis_available': bank.apheresis_available,
            'service_time': bank.service_time,
            'license_no': bank.license_no,
            'license_obtain_date': bank.license_obtain_date,
            'renewal_date': bank.renewal_date,
            'latitude': bank.latitude,
            'longitude': bank.longitude,
            'distance': None
        }
        if user_lat and user_lng and bank.latitude and bank.longitude:
            bank_data['distance'] = haversine(user_lat, user_lng, bank.latitude, bank.longitude)
        results.append(bank_data)

    if user_lat and user_lng:
        results.sort(key=lambda x: x['distance'] if x['distance'] is not None else float('inf'))
    
    return jsonify(results)