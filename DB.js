import env from "dotenv";
import { createClient } from "@supabase/supabase-js";
import dummyData from "./data.json" with { type: "json"};

env.config();

// generate
let a = true;

async function generateRoadmap(userInput) {
    try {
        const response = await fetch('http://localhost:8000/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: userInput
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        a = false
        const data = await response.json();
        console.log('Received data:', typeof(data.data)); 
        // console.log('Received data:', typeof(data), data); 
        
        // Use the data in your frontend
        if (data.success) {
            // displayRoadmap(data.data);
            return JSON.parse(data.data);
        }
        
        return data;
    } catch (error) {
      a = false
        console.error('Error:', error);
        throw error;
    }
}

if (a){
  // const res = await fetch("http://localhost:8000/health").then(res => console.log(res))
  // console.log(res)
  // a = false
  
  // test()
  // a = false
}

// Example usage
const userQuery = "my current role is student and need to be a content creator with in 2 month need min 6 module";
if (a) {
// generateRoadmap(userQuery);
a = false;
}
// Supabase Client
const superbase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const supaclient = (token) =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );

// ============================================
// AUTH API
// ============================================
const authAPI = {
  login: async (email, password) => {
    return await superbase.auth.signInWithPassword({ email, password });
  },
  signup: async (email, password) => {
    return await superbase.auth.signUp({ email, password });
  },
  getUser: async (token) => {
    return await superbase.auth.getUser(token);
  },
  logout: async () => {
    return await superbase.auth.signOut();
  },
   refreshSession: async (refreshToken) => {
    return await superbase.auth.refreshSession({ refresh_token: refreshToken });
  },
};

// ============================================
// USER API
// ============================================
const fetchAll = async (collection, token) => {
  var client = supaclient(token);
  return await client.from(collection).select();
};

const userAPI = {
  fetchProfile: async (token) => {
    return await fetchAll("profiles", token);
  },
  updateProfile: async (data, token) => {
    var client = supaclient(token);
    return await client.from("profiles").upsert(
      [
        {
          user_id: data.user_id,
          name: data.name,
          email: data.email,
          country: data.country,
          street_address: data.street_address,
          city: data.city,
          region: data.region,
          postal_code: data.postal_code,
          current_job: data.current_job,
          expected_role: data.expected_role,
          expected_ctc: data.expected_ctc,
          transition_time: data.transition_time,
          career_note: data.career_note,
          photo_url: data.photo_url,
          cover_photo_url: data.cover_photo_url,
          created_at: new Date(),
          updated_at: new Date(),
          username: data.username,
          about: data.about,
        },
      ],
      { onConflict: "user_id" }
    );
  },
  deleteProfile: async (id, token) => {
    var client = supaclient(token);
    return await client.from("profiles").delete().match({ id });
  },
};

// ============================================
// COURSE API (NEW)
// ============================================
const courseAPI = {
  // Create a complete course with modules and projects
  createCourse: async (courseD, token) => {
    const client = supaclient(token);

    // Connect Api 
    console.log("Db ", courseD.data);
    const courseData = await generateRoadmap(courseD.data);
    console.log("DB course",typeof(courseData));
    console.log("DB course",courseData.course_name);

    try {
      // Get current user
      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError) throw userError;
      const userId = userData.user.id;

       console.log("Step 1: Inserting course...");
      // 1. Insert Course
      const { data: course, error: courseError } = await client
        .from("course")
        .insert({
          course_name: courseData.course_name,
          course_domain: courseData.course_domain,
          course_time: courseData.course_time,
          course_description: courseData.course_description,
          course_level: courseData.course_level,
        })
        .select()
        .single();

      if (courseError) {
    console.error("❌ Course insert failed:", courseError);
    throw courseError;
  }
  console.log("✅ Course inserted:", course.id);

  console.log("Step 2: Linking user to course...");

      // 2. Link user as creator
      const { error: userCourseError } = await client
        .from("user_courses")
        .insert({
          user_id: userId,
          course_id: course.id,
          role: "creator",
        });

      if (userCourseError) {
    console.error("❌ User-course link failed:", userCourseError);
    throw userCourseError;
  }
  console.log("✅ User linked to course");
  var i= 1;

      // 3. Insert Modules (Roadmaps) and Projects
      for (const module of courseData.module) {
        // Insert Project first
         console.log(`Step 3.${i}: Inserting project for module ${i + 1}...`);
        const { data: project, error: projectError } = await client
          .from("project")
          .insert({
            git_repo: module.project.git_repo,
            description: module.project.description,
            type: module.project.type,
            domain: module.project.domain,
            issue: module.project.issue,
            language: module.project.language,
          })
          .select()
          .single();

        if (projectError) {
        console.error(`❌ Project ${i + 1} insert failed:`, projectError);
        throw projectError;
      }
      console.log(`✅ Project ${i + 1} inserted:`, project.id);

        console.log(`Step 4.${i}: Inserting roadmap for module ${i + 1}...`);

        // Insert Roadmap
        const { error: roadmapError } = await client.from("roadmap").insert({
          title: module.title,
          description: module.description,
          project_id: project.id,
          course_id: course.id,
          skills: module.skills,
          tutorial: module.tutorial,
          assessment: module.Assessment,
          level: module.level,
          time: module.time,
        });

        if (roadmapError) {
        console.error(`❌ Roadmap ${i + 1} insert failed:`, roadmapError);
        throw roadmapError;
      }
      console.log(`✅ Roadmap ${i + 1} inserted`);
      }
console.log("✅ All inserts completed successfully");
      return { data: course, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get all courses (explore view)
  getAllCourses: async (token) => {
    const client = supaclient(token);
    return await client
      .from("explore")
      .select("*")
      .order("created_at", { ascending: false });
  },

  // Get courses by domain
  getCoursesByDomain: async (domain, token) => {
    const client = supaclient(token);
    return await client.from("explore").select("*").eq("course_domain", domain);
  },

  // Get single course with all modules
  getCourseById: async (courseId, token) => {
    const client = supaclient(token);

    // Get course details
    const { data: course, error: courseError } = await client
      .from("course")
      .select("*")
      .eq("id", courseId)
      .maybeSingle();
    // console.log("inid",course, courseError)
    if (courseError) return { data: null, error: courseError };

    // Get all roadmaps with projects
    const { data: roadmaps, error: roadmapError } = await client
      .from("roadmap")
      .select(
        `
        *,
        project:project_id (*)
      `
      )
      .eq("course_id", courseId);
// console.log("rm",roadmapError, roadmaps)
    if (roadmapError) return { data: null, error: roadmapError };
      
    return {
      data: {
        ...course,
        modules: roadmaps,
      },
      error: null,
    };
  },

  // Get Single module from id
  getModuleById: async (courseId, token) => {
    const client = supaclient(token);

    // Get  roadmap with projects
    const { data, error } = await client
      .from("roadmap")
      .select(
        `
        *,
        project:project_id (*)
      `
      )
      .eq("id", courseId);

    if (error) return { data: null, error };
    return {
      data,
      error: null,
    };
  },

  // Get Project by module Id
  getProjectById: async (moduleId, token) => {
    const client = supaclient(token);

    // Get Project with module id
    const { data, error } = await client
      .from("project")
      .select("*")
      .eq("id", moduleId);

    if (error) return { data: null, error };
      
    return {
      data: data,
      error: null,
    };
  },

  getProjectsByCourseId: async (courseId, token) => {
    const client = supaclient(token);

    // Get course details
    const { data: course, error: courseError } = await client
      .from("course")
      .select("*")
      .eq("id", courseId)
      .maybeSingle();

    if (courseError) return { data: null, error: courseError };

    // Get all Projects
    const { data: projects, error: projectError } = await client
      .from("roadmap")
      .select("project:project_id (*)")
      .eq("course_id", courseId);

    if (projectError) return { data: null, error: projectError };
      
    return {
      data: {
        ...course,
        projects,
      },
      error: null,
    };
  },

  // Get user's created courses
  getUserCourses: async (token) => {
    const client = supaclient(token);

    const { data: userData } = await client.auth.getUser();
    const userId = userData.user.id;

    return await client
      .from("user_courses")
      .select(
        `
        *,
        course:course_id (
          *,
          explore!explore_course_id_fkey (*)
        )
      `
      )
      .eq("user_id", userId)
      .eq("role", "creator");
  },

  // Get user's enrolled courses
  getEnrolledCourses: async (token) => {
    const client = supaclient(token);

    const { data: userData } = await client.auth.getUser();
    const userId = userData.user.id;

    return await client
      .from("user_courses")
      .select(
        `
        *,
        course:course_id (
          *,
          roadmap (count)
        )
      `
      )
      .eq("user_id", userId)
      .in("role", ["enrolled", "completed"]);
  },

  // Enroll in a course
  enrollInCourse: async (courseId, token) => {
    const client = supaclient(token);

    const { data: userData } = await client.auth.getUser();
    const userId = userData.user.id;

    // Add to user_courses
    const { error: enrollError } = await client.from("user_courses").insert({
      user_id: userId,
      course_id: courseId,
      role: "enrolled",
    });

    if (enrollError) return { data: null, error: enrollError };

    // Update explore users array
    const { error: exploreError } = await client.rpc("array_append", {
      table_name: "explore",
      column_name: "users",
      value: userId,
      row_id: courseId,
    });

    return { data: { success: true }, error: exploreError };
  },

  // Update course progress
  updateProgress: async (courseId, progress, token) => {
    const client = supaclient(token);

    const { data: userData } = await client.auth.getUser();
    const userId = userData.user.id;

    return await client
      .from("user_courses")
      .update({ progress })
      .match({ user_id: userId, course_id: courseId });
  },

  // Delete course (creator only)
  deleteCourse: async (courseId, token) => {
    const client = supaclient(token);

    const { data: userData } = await client.auth.getUser();
    const userId = userData.user.id;

    // Check if user is creator
    const { data: userCourse } = await client
      .from("user_courses")
      .select("role")
      .match({ user_id: userId, course_id: courseId })
      .single();

    if (!userCourse || userCourse.role !== "creator") {
      return { data: null, error: { message: "Unauthorized" } };
    }

    // Delete course (cascade will handle roadmaps, projects, etc.)
    return await client.from("course").delete().eq("id", courseId);
  },
};

export { fetchAll, authAPI, userAPI, courseAPI };
