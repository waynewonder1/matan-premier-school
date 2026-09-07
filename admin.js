const SUPABASE_URL =
  'https://rfppiqqfojbcqehsvwcr.supabase.co';

const SUPABASE_KEY =
  'sb_publishable_qfbst0yt9KjV-Iwt02T8AA_Dq3Ev5KV';

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


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


// -------------------------
// LOGIN
// -------------------------

loginForm.addEventListener('submit', async (event) => {

  event.preventDefault();

  const email =
    document.getElementById('adminEmail').value.trim();

  const password =
    document.getElementById('adminPassword').value;

  loginStatus.textContent = 'Signing in...';

  const { data, error } =
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

  showDashboard();

});


// -------------------------
// LOAD ENQUIRIES
// -------------------------

async function loadEnquiries() {

  enquiriesList.innerHTML = 'Loading enquiries...';

  const { data, error } =
    await supabaseClient
      .from('enquiries')
      .select('*')
      .order('created_at', {
        ascending: false
      });

  if (error) {

    console.error(error);

    enquiriesList.innerHTML =
      'Could not load enquiries.';

    return;
  }

  totalEnquiries.textContent = data.length;

  latestCount.textContent =
    Math.min(data.length, 5);

  if (data.length === 0) {

    enquiriesList.innerHTML =
      '<p>No enquiries yet.</p>';

    return;
  }

  enquiriesList.innerHTML = '';

  data.forEach((enquiry) => {

    const card =
      document.createElement('article');

    card.className = 'enquiry-card';

    const date =
      new Date(enquiry.created_at)
        .toLocaleString();

    card.innerHTML = `
      <h3>${escapeHTML(enquiry.name)}</h3>

      <div class="enquiry-meta">
        ${escapeHTML(enquiry.email)}
        ${enquiry.phone
          ? ' · ' + escapeHTML(enquiry.phone)
          : ''}
        <br>
        ${date}
      </div>

      <p>
        ${escapeHTML(enquiry.message)}
      </p>
    `;

    enquiriesList.appendChild(card);

  });

}


// -------------------------
// SHOW DASHBOARD
// -------------------------

async function showDashboard() {

  loginSection.style.display = 'none';

  dashboard.style.display = 'block';

  await loadEnquiries();

}


// -------------------------
// LOGOUT
// -------------------------

logoutButton.addEventListener('click', async () => {

  await supabaseClient.auth.signOut();

  dashboard.style.display = 'none';

  loginSection.style.display = 'block';

});


// -------------------------
// CHECK EXISTING LOGIN
// -------------------------

async function checkSession() {

  const {
    data: { session }
  } =
    await supabaseClient.auth.getSession();

  if (session) {

    showDashboard();

  }

}

checkSession();


// -------------------------
// ESCAPE USER CONTENT
// -------------------------

function escapeHTML(value) {

  if (!value) return '';

  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

}