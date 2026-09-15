# Matan Premier Schools Website

A responsive website built for Matan Premier Schools to provide information about the school and allow visitors to submit inquiries and book a visit.

## Features

- Responsive school website
- About, Gallery, Contact, and Privacy Policy pages
- Contact and book-a-visit inquiry form
- Admin dashboard for managing inquiries
- Search and filter inquiries
- Update inquiry status
- Archive and delete inquiries
- Admin authentication

## Technologies

- HTML
- CSS
- JavaScript
- Supabase
- PostgreSQL

## How It Works

Visitors can submit an inquiry or book-a-visit request through the website. The information is stored in a Supabase PostgreSQL database.

Authorized administrators can log into the dashboard to:

- View submitted inquiries
- Search and filter inquiries
- Mark inquiries as read or contacted
- Archive or delete inquiries

## Project Structure

```text
matan-premier-school/
├── index.html
├── about.html
├── gallery.html
├── contact.html
├── admin.html
├── script.js
├── admin.js
├── style.css
└── supabase/
