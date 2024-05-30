const Module = require("../models/ModuleModal");
const { createClient } = require('@supabase/supabase-js');
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseUrl = process.env.SUPABASE_URL;

const supabase = createClient(supabaseUrl, supabaseKey);

exports.createModules = async (req, res) => {
    try {
        const { module, description,submodule } = req.body;
        const existingModule = await Module.findOne({ module });
    
        if (existingModule) {
            return res.status(403).json({ message: [{ key: "error", value: "Module Name already exists" }] });
        }

        if (!module || !description || !submodule) {
            return res.status(400).json({ message: [{ key: "error", value: "Required fields" }] });
        }

        const iconFile = req.files?.icon;

        if (!iconFile) {
          return res.status(400).json({
            message: [{ key: "error", value: "Module icon is required" }],
          });
        }
    
        if (iconFile.size > 5 * 1024 * 1024) {
          return res.status(400).json({
            message: [
              {
                key: "error",
                value: "Module icon size exceeds the 5MB limit",
              },
            ],
          });
        }
    
        const uniqueFileName = `${Date.now()}_${iconFile.name}`;
    
        try {
          const { data, error } = await supabase.storage
            .from('Placement/module')
            .upload(uniqueFileName, iconFile.data);
    
          if (error) {
            console.error("Error uploading icon to Supabase:", error);
            return res.status(500).json({
              message: [{ key: "error", value: "Error uploading icon to Supabase" }],
            });
          }
    
          const iconUrl = `${supabaseUrl}/storage/v1/object/public/Placement/module/${uniqueFileName}`;
    
            const newModule = new Module({
                module,
                submodule:submodule.split(","),
                description,
                icon: iconUrl,
            }); 

            await newModule.save();

            return res.status(201).json({ message: [{ key: "Success", value: "Module Added Successfully" }] });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: [{ key: "error", value: "Internal server error" }] });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: [{ key: "error", value: "Internal server error" }] });
    }
};


exports.getAllModule = async (req, res) => {
    try {
        const modules = await Module.find();

        return res.status(200).json({
            message: [{ key: 'success', value: 'modules Retrieved successfully' }],
            getAllModules: modules,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: [{ key: 'error', value: 'Internal server error' }] });
    }
};

exports.getModuleById = async (req, res) => {
    const { id } = req.params;
    try {
        const module = await Module.findById(id);
        if (!module) {
            return res.status(404).json({ message: [{ key: 'error', value: 'Module not found' }] });
        }


        return res.status(200).json({
            message: [{ key: 'success', value: 'Module Id based Retrieved successfully' }],
            moduleById: module
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: [{ key: 'error', value: 'Internal server error' }] });
    }
};


exports.updateModule = async (req, res) => {
    const { id } = req.params;
    const imageFile = req.files?.icon;

    const {
        module, description,submodule
    } = req.body;
  
    try {
      const modules = await Module.findById(id);
      if (!modules) {
        return res.status(404).json({ message: [{ key: "error", value: "module not found" }] });
      }
  
      if (imageFile) {
        if (modules.icon) {
            try {
                const imageUrlParts = modules.icon.split('/');
                const imageName = imageUrlParts[imageUrlParts.length - 1];
  
                const {data,error} =  await supabase.storage
                .from('Placement')
                .remove(`module/${[imageName]}`);
               
            } catch (error) {
                console.error(error);
                return res.status(500).json({ message: [{ key: "error", value: "Error removing existing image from Supabase storage" }] });
            }
        }
  
        const uniqueFileName = `${Date.now()}_${imageFile.name}`;
  
  
        const { data, error } = await supabase.storage
          .from("Placement/module")
          .upload(uniqueFileName, imageFile.data);
  
        if (error) {
          return res.status(500).json({ message: [{ key: "error", value: "Error uploading image to Supabase" }] });
        }
        const imageUrl = `${supabaseUrl}/storage/v1/object/public/Placement/module/${uniqueFileName}`;

        modules.icon = imageUrl;
      }
  
      modules.module = module;
      modules.submodule = submodule.split(",");
      modules.description = description;
  
      await modules.save();
  
      return res.status(200).json({ message: [{ key: "success", value: "Module updated successfully" }], updated_modules: modules });
    } catch (error) {
      console.error("Error updating module:", error);
      return res.status(500).json({ message: [{ key: "error", value: "Internal server error" }] });
    }
  };


  exports.deleteModules = async (req, res) => {
    const { id } = req.params;
  
    try {
      const modules = await Module.findById(id);
  
      if (!modules) {
        return res.status(404).json({ message: [{ key: "error", value: "modules not found" }] });
      }
  
      if (modules.icon) {
        const imageUrlParts = modules.icon.split('/');
        const imageName = imageUrlParts[imageUrlParts.length - 1];
  
        try {
          await supabase.storage
          .from('Placement')
          .remove(`module/${[imageName]}`);
        } catch (error) {
          console.error("Error deleting image from Supabase:", error);
        }
      }
  
  
      await Module.findByIdAndDelete(id);
  
      return res.status(200).json({ message: [{ key: "success", value: "modules deleted successfully" }], deleted_module: modules });
    } catch (error) {
      console.error("Error deleting modules:", error);
      return res.status(500).json({ message: [{ key: "error", value: "Internal server error" }] });
    }
  };