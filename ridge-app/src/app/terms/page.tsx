import { LegalPage } from '@/components/LegalPage';

export const metadata = { title: 'Terms of Service — Ridge' };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="September 2026">
      <p>
        Ridge is a marathon training app built by an individual developer, Nick Walker. By creating an account you
        agree to these terms. Contact: <a href="mailto:nicholasluiswalker@gmail.com">nicholasluiswalker@gmail.com</a>.
      </p>

      <h2>Not medical advice</h2>
      <p>
        Ridge, including its coach feature, provides training and general fitness guidance only. It is not a
        substitute for professional medical advice, diagnosis, or treatment. For pain, injury, or anything medical,
        see a physiotherapist or doctor. Training plans and predicted times are estimates based on your data and
        general exercise-physiology models — they are not guarantees of performance and following them is at your
        own risk.
      </p>

      <h2>Your account</h2>
      <p>
        You're responsible for keeping your login credentials secure and for the accuracy of information you
        provide. You must be at least 13 years old to use Ridge.
      </p>

      <h2>Garmin connection</h2>
      <p>
        Connecting Garmin is optional and can be revoked at any time from Garmin Connect's account settings. Ridge
        uses Garmin's official API under Garmin's own developer terms; your use of Garmin's platform is separately
        governed by Garmin's own terms and privacy policy.
      </p>

      <h2>Acceptable use</h2>
      <p>Don't misuse Ridge — no attempting to access other users' data, no interfering with the service, no reverse-engineering beyond what's legally permitted.</p>

      <h2>No warranty</h2>
      <p>
        Ridge is provided "as is," without warranties of any kind. We don't guarantee the service will be
        uninterrupted, error-free, or that any prediction, plan, or coach reply will be accurate for your specific
        situation.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, Ridge and its developer aren't liable for any indirect, incidental,
        or consequential damages arising from your use of the app, including injury sustained while following a
        training plan.
      </p>

      <h2>Changes</h2>
      <p>These terms may be updated from time to time; continued use after a change means you accept the update.</p>
    </LegalPage>
  );
}
