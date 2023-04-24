# NYC Department of Buildings Active Complaint List

## Data + Process
- [Original dataset](https://data.cityofnewyork.us/Housing-Development/DOB-Complaints-Received/eabe-havv) from NYC Open Data
- Geocoded 98% of over 600k complaints (using [US Census Geocoder](https://geocoding.geo.census.gov/geocoder/)
- Color scheme based on [old priority categorization](https://data.cityofnewyork.us/api/views/eabe-havv/files/dc709ed2-7af1-429c-92c9-71ec3a4c23fa?download=true&filename=DOBComplaints_complaint_category_list.pdf)
- New [category prioritization](https://www.nyc.gov/assets/buildings/pdf/complaint_category.pdf) descriptions (post 2021)

## Notes
- Due to the density of points, the "All Complaints" layer shifts on zooming in to show all points, rather than showing points that cannot be accessed.
- Map interaction groups all complaints for a given building upon clicking a point.
