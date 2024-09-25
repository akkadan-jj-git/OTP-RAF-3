/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', 'N/search', 'N/ui/serverWidget'],
    /**
 * @param{record} record
 * @param{search} search
 * @param{serverWidget} serverWidget
 */
    (record, search, serverWidget) => {
        function employeeSearch(){
            let employeeSearch = search.create({
                type: search.Type.EMPLOYEE,
                filters: [
                    ['salesrep', 'is', 'T'],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: ['internalid', 'entityid']
            });
            let results = employeeSearch.run().getRange({
                start: 0,
                end: 1000
            });
            return results;
        }
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            try{
                if(scriptContext.request.method === 'GET'){
                    let form = serverWidget.createForm({
                        title: 'Employee Commission Calculator'
                    });
                    form.clientScriptFileId = 4046;
                    let fieldGroup1 = form.addFieldGroup(
                    {
                        id: 'custpage_field_group',
                        label: 'Select Employee'
                    });
                    let salesRepField = form.addField({
                        id: 'custpage_employee',
                        label: 'Employee Name',
                        type: serverWidget.FieldType.SELECT,
                        container: 'custpage_field_group'
                    });
                    salesRepField.addSelectOption({
                        value: '',
                        text: 'Choose one Employee'
                    });
                    let employeeList = employeeSearch();
                    employeeList.forEach(function(result){
                        let employeeDetails = {
                            name: result.getValue({name: 'entityid'}),
                            internalId: result.getValue({name: 'internalid'})
                        };
                        salesRepField.addSelectOption({
                            value: employeeDetails.internalId,
                            text: employeeDetails.name
                        });
                    });
                    let commissionField = form.addField({
                        id: 'custpage_commission',
                        label: 'Total Amount',
                        type: serverWidget.FieldType.CURRENCY,
                        container: 'custpage_field_group'
                    });
                    commissionField.setHelpText({
                        help: "This field shows the commission amount set automatically for the Sales Rep you've chosen. It is calculated considering the employee's 2023 sales. However, you can still make changes to the amount."
                    })

                    let empId = scriptContext.request.parameters.employeeId || '';
                    let empname = scriptContext.request.parameters.employeeName || '';
                    salesRepField.defaultValue = empId;
                    let filters = [
                        ["type","anyof","CustInvc"], 
                        "AND", 
                        ["trandate","within","1/1/2023","12/31/2023"], 
                        "AND", 
                        ["mainline","is","T"]
                    ];
                    if(empId){
                        filters.push('AND', ["salesrep","anyof", empId]);
                        log.debug('Customer Filter', filters);
                        let employeeSearch = search.create({
                            type: search.Type.INVOICE,
                            filters: filters,
                            columns:['salesrep', 'amount']
                        });
                        let results = employeeSearch.run().getRange({ start: 0, end: 1 });
                        let totalCommission;
                        if (results.length > 0) {
                            let result = results[0];
                            totalCommission = parseFloat(result.getValue({
                                name: 'amount'
                            })) || 0;
                        }
                        if(totalCommission != null){
                            totalCommission = totalCommission + (totalCommission * 0.02);
                            commissionField.defaultValue = totalCommission.toFixed(2);
                        }else{
                            totalCommission = 0;
                            commissionField.defaultValue = totalCommission;
                        }
                        log.debug('Total Amount', totalCommission);
                    }

                    form.addSubmitButton({
                        label: 'Submit Commission Data'
                    });
                    scriptContext.response.writePage(form);
                }
                else if(scriptContext.request.method === 'POST') {
                    let commissionRecordId, out;
                    let rep = scriptContext.request.parameters.custpage_employee;
                    let commissionAmount = scriptContext.request.parameters.custpage_commission;
                    log.debug('Commission Amount', commissionAmount);
                    if(commissionAmount == 0){
                        out = 'The employee has not made any transaction during 2023. So, no record has been created.';
                    }
                    else{
                        let existingRecord = search.create({
                            type: 'customrecord_jj_custrec_emp_commission',
                            filters: [
                                ['custrecord_jj_emp_name', 'is', rep]
                            ]
                        }).run().getRange({ start: 0, end: 1 });
                        if(existingRecord.length > 0) {
                            // update existing record
                            let recordId = existingRecord[0].id;
                            let commissionRecord = record.load({
                                type: 'customrecord_jj_custrec_emp_commission',
                                id: recordId
                            });
                            commissionRecord.setValue({
                                fieldId: 'custrecord_jj_commission',
                                value: commissionAmount
                            });
                            commissionRecordId = commissionRecord.save();
                            log.debug('Updated Commission Record', commissionRecordId);
                            out = 'Commission data has been updated in the existing Employee Commission Record. \n\nDetails\nInternal Id:\t' + commissionRecordId + '\nEmployee Id:\t' + rep;
                        }else{
                            //create new record
                            let commissionRecord = record.create({
                                type: 'customrecord_jj_custrec_emp_commission'
                            });
                            commissionRecord.setValue({
                                fieldId: 'custrecord_jj_emp_name',
                                value: rep
                            });
                            commissionRecord.setValue({
                                fieldId: 'custrecord_jj_commission',
                                value: commissionAmount
                            });
                            commissionRecordId = commissionRecord.save();
                            log.debug('New Commission Record', commissionRecordId);
                            out = 'Commission data has been stored to a new Employee Commission Record. \n\nDetails\nInternal Id:\t' + commissionRecordId + '\nEmployee Id:\t' + rep;
                        }
                    }
                    scriptContext.response.write(out);
                }
            }
            catch(e){
                log.debug('Error@onRequest', e.message + e.stack);
            }
        }

        return {onRequest}

    });
