const FacilitiesModel = require('../models/Facility');
const ResponseAPI = require('../utils/response');

const facilityController = {

    async createFacility(req, res) {
        try {
            const facility = await FacilitiesModel.create({
                ...req.body,
                userId: req.user._id
            });

            ResponseAPI.success(res, facility, 'Facility created successfully', 201);
        } catch (error) {
            ResponseAPI.serverError(res, error);
        }
    },

    async getUserFacilities(req, res) {
        try {
            const facilities = await FacilitiesModel.find({ userId: req.user._id });
            ResponseAPI.success(res, facilities);
        } catch (error) {
            ResponseAPI.serverError(res, error);
        }
    },

    async getFacility(req, res) {
        try {
            const facility = await FacilitiesModel.findOne({
                _id: req.params.id,
                userId: req.user._id
            });

            if (!facility) {
                return ResponseAPI.notFound(res, 'Facility not found');
            }

            ResponseAPI.success(res, facility);
        } catch (error) {
            ResponseAPI.serverError(res, error);
        }
    },

    async updateFacility(req, res) {
        try {
            const facility = await FacilitiesModel.findOne({
                _id: req.params.id,
                userId: req.user._id
            });

            if (!facility) {
                return ResponseAPI.notFound(res, 'Facility not found');
            }

            Object.assign(facility, req.body);
            // console.log(req.body.facility)
            await facility.save();

            ResponseAPI.success(res, facility, 'Facility updated successfully');
        } catch (error) {
            ResponseAPI.serverError(res, error);
        }
    },

    async searchByName(req, res) {
        try {
            const facilities = await FacilitiesModel.find({
                name: { $regex: req.query.name, $options: 'i' },
                userId: req.user._id
            });

            if (facilities.length === 0) {
                return ResponseAPI.notFound(res, 'Facility not found');
            }

            ResponseAPI.success(res, facilities);
        } catch (error) {
            ResponseAPI.serverError(res, error);
        }
    },

    async deleteFacility(req, res) {
        try {
            const facility = await FacilitiesModel.findOneAndDelete({
                _id: req.params.id,
                userId: req.user._id
            });

            if (!facility) {
                return ResponseAPI.notFound(res, 'Facility not found');
            }

            ResponseAPI.success(res, null, 'Facility deleted successfully');
        } catch (error) {
            ResponseAPI.serverError(res, error);
        }
    }
};

module.exports = facilityController;