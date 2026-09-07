const SUPABASE_URL =
  'https://rfppiqqfojbcqehsvwcr.supabase.co';

const SUPABASE_KEY =
  'sb_publishable_qfbst0yt9KjV-Iwt02T8AA_Dq3Ev5KV';

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// =========================
// PAGE ELEMENTS
// =========================

const loginSection =
  document.getElementById('loginSection');

const dashboard =
  document.getElementById('dashboard');

const loginForm =
  document.getElementById('adminLoginForm');

const loginStatus =
  document.getElementById('loginStatus');

const logoutButton =
  document.getElementById('logoutButton');

const enquiriesList =
  document.getElementById('enquiriesList');

const totalEnquiries =
  document.getElementById('totalEnquiries');

const latestCount =
  document.getElementById('latestCount');

const enquirySearch =
  document.getElementById('enquirySearch');


// =========================
// ENQUIRY DATA
// =========================

let allEnquiries = [];
let currentFilter = 'all';


// =========================
// LOGIN
// =========================

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {

    event.preventDefault();

    const email =
      document.getElementById('adminEmail').value.trim();

    const password =
      document.getElementById('adminPassword').value;

    loginStatus.textContent = 'Signing in...';

    const { error } =
      await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

    if (error) {
      console.error(error);

      loginStatus.textContent =
        'Incorrect email or password.';

      return;
    }

    loginStatus.textContent = '';

    await showDashboard();
  });
}


// =========================
// LOAD ENQUIRIES
// =========================

async function loadEnquiries() {

  enquiriesList.innerHTML =
    'Loading enquiries...';

  const { data, error } =
    await supabaseClient
      .from('enquiries')
      .select('*')
      .eq('archived', false)
      .order('created_at', {
        ascending: false
      });

  if (error) {
    console.error(error);

    enquiriesList.innerHTML =
      'Could not load enquiries.';

    return;
  }

  allEnquiries = data || [];

  totalEnquiries.textContent =
    allEnquiries.length;

  const newCount =
    allEnquiries.filter(
      enquiry =>
        (enquiry.status || 'new') === 'new'
    ).length;

  latestCount.textContent =
    newCount;

  renderEnquiries();
}


// =========================
// RENDER ENQUIRIES
// =========================

function renderEnquiries() {

  const searchTerm =
    enquirySearch
      ? enquirySearch.value.toLowerCase().trim()
      : '';

  let filtered = [...allEnquiries];


  // FILTER BY STATUS

  if (currentFilter !== 'all') {
    filtered = filtered.filter(
      enquiry =>
        (enquiry.status || 'new') === currentFilter
    );
  }


  // SEARCH

  if (searchTerm) {

    filtered = filtered.filter(enquiry => {

      const searchableText = `
        ${enquiry.name || ''}
        ${enquiry.email || ''}
        ${enquiry.phone || ''}
        ${enquiry.message || ''}
      `.toLowerCase();

      return searchableText.includes(searchTerm);

    });
  }


  // NO RESULTS

  if (filtered.length === 0) {

    enquiriesList.innerHTML =
      '<p>No matching enquiries.</p>';

    return;
  }


  enquiriesList.innerHTML = '';


  filtered.forEach((enquiry) => {

    const card =
      document.createElement('article');

    card.className =
      'enquiry-card';

    const status =
      enquiry.status || 'new';

    const date =
      new Date(enquiry.created_at)
        .toLocaleString();

    const safeName =
      escapeHTML(enquiry.name);

    const safeEmail =
      escapeHTML(enquiry.email);

    const safePhone =
      escapeHTML(enquiry.phone);

    const safeMessage =
      escapeHTML(enquiry.message);


    const emailHTML =
      enquiry.email
        ? `
          <a href="mailto:${safeEmail}">
            ${safeEmail}
          </a>
        `
        : 'No email provided';


    const phoneHTML =
      enquiry.phone
        ? `
          <a href="tel:${safePhone}">
            ${safePhone}
          </a>
        `
        : 'No phone provided';


    card.innerHTML = `

      <div class="enquiry-top">

        <div>

          <h3>
            ${safeName}
          </h3>

          <div class="enquiry-meta contact-links">

            ${emailHTML}

            <br>

            ${phoneHTML}

            <br>

            ${date}

          </div>

        </div>


        <span class="status-badge status-${status}">
          ${status}
        </span>

      </div>


      <p>
        ${safeMessage}
      </p>


      <div class="enquiry-actions">

        ${
          status === 'new'
            ? `
              <button
                onclick="updateStatus(${enquiry.id}, 'read')">

                Mark as Read

              </button>
            `
            : ''
        }


        ${
          status !== 'contacted'
            ? `
              <button
                class="contacted-btn"
                onclick="updateStatus(${enquiry.id}, 'contacted')">

                Mark as Contacted

              </button>
            `
            : ''
        }


        <button
          class="archive-btn"
          onclick="archiveEnquiry(${enquiry.id})">

          Archive

        </button>


        <button
          class="delete-btn"
          onclick="deleteEnquiry(${enquiry.id})">

          Delete

        </button>

      </div>
    `;

    enquiriesList.appendChild(card);

  });
}


// =========================
// UPDATE STATUS
// =========================

async function updateStatus(id, status) {

  const { error } =
    await supabaseClient
      .from('enquiries')
      .update({
        status: status
      })
      .eq('id', id);

  if (error) {

    console.error(error);

    alert(
      'Could not update enquiry.'
    );

    return;
  }

  await loadEnquiries();
}


// =========================
// ARCHIVE ENQUIRY
// =========================

async function archiveEnquiry(id) {

  const confirmed =
    confirm(
      'Archive this enquiry?'
    );

  if (!confirmed) return;


  const { error } =
    await supabaseClient
      .from('enquiries')
      .update({
        archived: true
      })
      .eq('id', id);

  if (error) {

    console.error(error);

    alert(
      'Could not archive enquiry.'
    );

    return;
  }

  await loadEnquiries();
}


// =========================
// DELETE ENQUIRY
// =========================

async function deleteEnquiry(id) {

  const confirmed =
    confirm(
      'Permanently delete this enquiry? This cannot be undone.'
    );

  if (!confirmed) return;


  const { error } =
    await supabaseClient
      .from('enquiries')
      .delete()
      .eq('id', id);

  if (error) {

    console.error(error);

    alert(
      'Could not delete enquiry.'
    );

    return;
  }

  await loadEnquiries();
}


// =========================
// SEARCH
// =========================

if (enquirySearch) {

  enquirySearch.addEventListener(
    'input',
    renderEnquiries
  );
}


// =========================
// FILTER BUTTONS
// =========================

document
  .querySelectorAll('.filter-btn')
  .forEach(button => {

    button.addEventListener(
      'click',
      () => {

        document
          .querySelectorAll('.filter-btn')
          .forEach(btn =>
            btn.classList.remove('active')
          );

        button.classList.add('active');

        currentFilter =
          button.dataset.filter;

        renderEnquiries();

      }
    );

  });


// =========================
// SHOW DASHBOARD
// =========================

async function showDashboard() {

  loginSection.style.display =
    'none';

  dashboard.style.display =
    'block';

  await loadEnquiries();
}


// =========================
// LOGOUT
// =========================

if (logoutButton) {

  logoutButton.addEventListener(
    'click',
    async () => {

      await supabaseClient.auth.signOut();

      dashboard.style.display =
        'none';

      loginSection.style.display =
        'block';

      allEnquiries = [];

    }
  );
}


// =========================
// CHECK EXISTING SESSION
// =========================

async function checkSession() {

  const {
    data: { session }
  } =
    await supabaseClient.auth.getSession();

  if (session) {
    await showDashboard();
  }
}

checkSession();


// =========================
// ESCAPE USER CONTENT
// =========================

function escapeHTML(value) {

  if (!value) return '';

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}