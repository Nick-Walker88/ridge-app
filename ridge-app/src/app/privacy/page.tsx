import { LegalPage } from '@/components/LegalPage';

export const metadata = { title: 'Privacy Policy — Ridge' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="September 2026">
      <p>
        Ridge ("Ridge", "we", "us") is a marathon training app built by an individual developer, Nick Walker. This
        policy explains what data Ridge collects, why, and how it's handled. Contact:{' '}
        <a href="mailto:nicholasluiswalker@gmail.com">nicholasluiswalker@gmail.com</a>.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account information</strong> — name, email address, and a hashed password when you create an
          account. We never store your password in plain text.
        </li>
        <li>
          <strong>Garmin data</strong>, if you connect your Garmin account — your running activities, heart rate,
          cadence, elevation, VO2max estimates, and training load data, pulled via Garmin's official API using
          OAuth2. We do not receive your Garmin username or password; Garmin handles that authentication directly.
        </li>
        <li>
          <strong>Training plan data</strong> you create or import — your race selection, goal times, and, if you
          use the CSV import feature, the training sessions you upload yourself.
        </li>
        <li>
          <strong>Coach conversations</strong> — messages you send to Ridge's in-app coach, and Ridge's replies.
        </li>
      </ul>

      <h2>How we use it</h2>
      <p>
        Solely to run the app: generating and adjusting your training plan, computing fitness/fatigue/form (CTL,
        ATL, TSB), showing your run history and splits, predicting race times, and answering your questions to the
        coach with your own data as context. When the coach uses a third-party language model (Anthropic's Claude
        API) to answer a question, the relevant context from your plan and activity history is sent to that request
        to generate the reply — Anthropic's own terms govern how they process that request.
      </p>

      <h2>What we don't do</h2>
      <ul>
        <li>We do not sell your data to anyone, ever.</li>
        <li>We do not share your Garmin data with third parties beyond what's needed to run the app (our hosting and database providers, described below).</li>
        <li>We do not use your data to train AI models.</li>
      </ul>

      <h2>Where data lives</h2>
      <p>
        Ridge runs on Vercel (application hosting) and Neon (Postgres database hosting). Both are standard
        infrastructure providers processing data on our behalf under their own security and privacy commitments —
        they don't use your data for their own purposes.
      </p>

      <h2>Your controls</h2>
      <ul>
        <li>
          You can revoke Ridge's access to your Garmin data at any time from Garmin Connect's own account settings
          (Connect IQ / connected apps), independent of Ridge.
        </li>
        <li>To delete your account and all associated data, email the contact address above.</li>
      </ul>

      <h2>Children's privacy</h2>
      <p>Ridge is not directed at children under 13, and we don't knowingly collect data from them.</p>

      <h2>Changes</h2>
      <p>If this policy changes materially, the "last updated" date above will change and, where practical, we'll note it in the app.</p>
    </LegalPage>
  );
}
