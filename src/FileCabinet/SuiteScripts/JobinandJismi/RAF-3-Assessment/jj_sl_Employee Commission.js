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
                        source: 'employee',
                        container: 'custpage_field_group'
                    });
                    
                    let sublist = form.addSublist({
                        id: 'custpage_commission_sublist',
                        type: serverWidget.SublistType.LIST,
                        label: 'Employee Commissions'
                    });
                    
                    sublist.addField({
                        id: 'custpage_emp_name',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Employee Name'
                    });
                    
                    sublist.addField({
                        id: 'custpage_sales_amount',
                        type: serverWidget.FieldType.CURRENCY,
                        label: 'Total Sales (2023)'
                    });
                    
                    sublist.addField({
                        id: 'custpage_commission_amount',
                        type: serverWidget.FieldType.CURRENCY,
                        label: 'Calculated Commission'
                    })

                    let empId = scriptContext.request.parameters.employee || '';
                    salesRepField.defaultValue = empId;
                    log.debug('Sales Rep', empId);
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
                            type: search.Type.EMPLOYEE,
                            filters: filters,
                            columns:
                            [ 'salesrep', 'amount'
                                // search.createColumn({
                                //     name: "salesrep",
                                //     summary: "GROUP",
                                //     label: "Sales Rep"
                                // }),
                                // search.createColumn({
                                //     name: "amount",
                                //     summary: "SUM",
                                //     label: "Amount"
                                // })
                            ]
                        });
                        let results = employeeSearch.run().getRange({ start: 0, end: 1000 });
                        results.forEach(function(result, index) {
                            sublist.setSublistValue({
                                id: 'custpage_emp_name',
                                line: index,
                                value: result.getValue('salesrep')
                            });
                            var salesAmount = result.getValue('amount');
                            log.debug('Amount', salesAmount);
                            var commission = salesAmount * 0.02;
                            
                            sublist.setSublistValue({
                                id: 'custpage_sales_amount',
                                line: index,
                                value: salesAmount
                            });
                            sublist.setSublistValue({
                                id: 'custpage_commission_amount',
                                line: index,
                                value: commission
                            });
                        });
                    }
                    form.addSubmitButton({
                        label: 'Submit Commission Data'
                    });
                    scriptContext.response.writePage(form);
                }
                else if(scriptContext.request.method === 'POST') {
                    let lineCount = scriptContext.request.getLineCount({
                        group: 'custpage_commission_sublist'
                    });
                    
                    for (let i = 0; i < lineCount; i++) {
                        let empId = scriptContext.request.getSublistValue({
                            group: 'custpage_commission_sublist',
                            name: 'custpage_emp_id',
                            line: i
                        });
                        
                        let commissionAmount = parseFloat(scriptContext.request.getSublistValue({
                            group: 'custpage_commission_sublist',
                            name: 'custpage_commission_amount',
                            line: i
                        }));
                        let existingRecord = search.create({
                            type: 'customrecord_jj_custrec_emp_commission',
                            filters: [
                                ['custrecord_jj_emp_name', 'is', empId]
                            ]
                        }).run().getRange({ start: 0, end: 1 });
                        
                        if (existingRecord.length > 0) {
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
                            commissionRecord.save();
                        } else{
                            //create new record
                            let commissionRecord = record.create({
                                type: 'customrecord_jj_custrec_emp_commission'
                            });
                            commissionRecord.setValue({
                                fieldId: 'custrecord_jj_emp_name',
                                value: empId
                            });
                            commissionRecord.setValue({
                                fieldId: 'custrecord_jj_commission',
                                value: commissionAmount
                            });
                            let commissionRecordId = commissionRecord.save();
                            log.debug('Commission Record', commissionRecordId);
                        }
                    }
                    context.response.write('Commission data has been processed successfully.');
                }
            }
            catch(e){
                log.debug('Error@onRequest', e.message + e.stack);
            }
        }

        return {onRequest}

    });
