import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { formData, jobId, userId } = await req.json();

    console.log('[API] Received request:', { formData, jobId, userId });

    // Validate required fields
    if (!formData.first_name || !formData.last_name || !formData.email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: first_name, last_name, email' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let applicantId = null;

    // Step 1: Check if applicant exists by email
    const { data: existingApplicant, error: checkError } = await supabaseClient
      .from('applicants')
      .select('id')
      .eq('email', formData.email)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[API] Error checking applicant:', checkError);
      return new Response(
        JSON.stringify({ error: checkError.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (existingApplicant) {
      // Update existing applicant
      applicantId = existingApplicant.id;
      console.log('[API] Updating existing applicant:', applicantId);
      
      const { error: updateError } = await supabaseClient
        .from('applicants')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone_number || null,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
          street_address: formData.street_address || null,
          barangay: formData.barangay || null,
          city: formData.city || null,
          province: formData.province || null,
          zip_code: formData.zip_code || null,
          licenses: formData.licenses || [],
          height_cm: formData.height_cm ? parseInt(formData.height_cm) : null,
          weight_kg: formData.weight_kg ? parseInt(formData.weight_kg) : null,
          user_id: userId || null
        })
        .eq('id', applicantId);

      if (updateError) {
        console.error('[API] Error updating applicant:', updateError);
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    } else {
      // Create new applicant
      console.log('[API] Creating new applicant...');
      
      // Generate reference code (try RPC, fallback if fails)
      let referenceCode = null;
      try {
        const { data: refCode } = await supabaseClient.rpc('generate_reference_code');
        referenceCode = refCode;
      } catch (err) {
        console.warn('[API] RPC failed, using fallback reference code');
        const year = new Date().getFullYear();
        const timestamp = Date.now().toString().slice(-6);
        referenceCode = `REF-${year}-${timestamp.slice(0, 3)}`;
      }

      const { data: newApplicant, error: insertError } = await supabaseClient
        .from('applicants')
        .insert({
          reference_code: referenceCode,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone_number || null,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
          street_address: formData.street_address || null,
          barangay: formData.barangay || null,
          city: formData.city || null,
          province: formData.province || null,
          zip_code: formData.zip_code || null,
          licenses: formData.licenses || [],
          height_cm: formData.height_cm ? parseInt(formData.height_cm) : null,
          weight_kg: formData.weight_kg ? parseInt(formData.weight_kg) : null,
          user_id: userId || null,
          status: 'Pending'
        })
        .select()
        .single();

      if (insertError) {
        // If duplicate email error, try to update instead
        if (insertError.code === '23505') {
          console.log('[API] Duplicate email, fetching and updating...');
          const { data: fetchedApplicant } = await supabaseClient
            .from('applicants')
            .select('id')
            .eq('email', formData.email)
            .single();
          
          if (fetchedApplicant) {
            applicantId = fetchedApplicant.id;
            const { error: updateError } = await supabaseClient
              .from('applicants')
              .update({
                first_name: formData.first_name,
                last_name: formData.last_name,
                phone: formData.phone_number || null,
                date_of_birth: formData.date_of_birth || null,
                gender: formData.gender || null,
                street_address: formData.street_address || null,
                barangay: formData.barangay || null,
                city: formData.city || null,
                province: formData.province || null,
                zip_code: formData.zip_code || null,
                licenses: formData.licenses || [],
                height_cm: formData.height_cm ? parseInt(formData.height_cm) : null,
                weight_kg: formData.weight_kg ? parseInt(formData.weight_kg) : null,
                user_id: userId || null
              })
              .eq('id', applicantId);
            
            if (updateError) {
              throw updateError;
            }
          } else {
            throw insertError;
          }
        } else {
          throw insertError;
        }
      } else {
        applicantId = newApplicant.id;
      }
    }

    // Step 2: Create or update application if jobId is provided
    if (jobId && applicantId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let actualJobId = jobId;
      
      // If jobId is not a valid UUID, try to find the job by a numeric ID or other identifier
      if (!uuidRegex.test(jobId)) {
        console.log('[API] jobId is not a valid UUID:', jobId);
        console.log('[API] Attempting to find job by alternative identifier...');
        
        // Try to find job - if jobId is numeric, we can't match it to UUID, so set to null
        // Or you could implement a lookup table if you have numeric IDs
        console.warn('[API] Invalid jobId format. Setting job_id to null in application.');
        actualJobId = null;
      }
      
      if (actualJobId) {
        // Check if application exists
        const { data: existingApp } = await supabaseClient
          .from('applications')
          .select('id')
          .eq('applicant_id', applicantId)
          .eq('job_id', actualJobId)
          .maybeSingle();

        if (existingApp) {
          // Update existing application
          await supabaseClient
            .from('applications')
            .update({
              current_step: 2,
              status: 'Pending'
            })
            .eq('id', existingApp.id);
        } else {
          // Create new application
          await supabaseClient
            .from('applications')
            .insert({
              job_id: actualJobId,
              applicant_id: applicantId,
              status: 'Pending',
              current_step: 2
            });
        }
      } else {
        // jobId is not a valid UUID - create application without job_id
        console.log('[API] Creating application without job_id (invalid jobId provided)');
        const { data: existingApp } = await supabaseClient
          .from('applications')
          .select('id')
          .eq('applicant_id', applicantId)
          .is('job_id', null)
          .maybeSingle();

        if (existingApp) {
          await supabaseClient
            .from('applications')
            .update({
              current_step: 2,
              status: 'Pending'
            })
            .eq('id', existingApp.id);
        } else {
          await supabaseClient
            .from('applications')
            .insert({
              job_id: null,
              applicant_id: applicantId,
              status: 'Pending',
              current_step: 2
            });
        }
      }
    }

    console.log('[API] Success! Applicant ID:', applicantId);
    return new Response(
      JSON.stringify({ 
        success: true, 
        applicantId,
        message: 'Applicant saved successfully'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('[API] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        details: error
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});



