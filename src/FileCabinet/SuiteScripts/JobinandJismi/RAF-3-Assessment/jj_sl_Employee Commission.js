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
                    let emp = form.addField({
                        id: 'custpage_employee',
                        label: 'Select an Employee',
                        type: serverWidget.FieldType.SELECT,
                        // source: string,
                        // container: string
                    });
                    let Commission = form.addField({
                        id: 'custpage_commission',
                        label: 'Calculated Commission',
                        type: serverWidget.FieldType.TEXT,
                        // source: string,
                        // container: string
                    })
                    let salesOrderSearch = search.create({
                        type: search.Type.SALES_ORDER,
                        filters: [
                            ["type","anyof","SalesOrd"], 
                            "AND", 
                            ["mainline","is","T"], 
                            "AND", 
                            ["salesrep","noneof","@NONE@"], 
                            "AND", 
                            ["trandate","within","1/1/2023","12/31/2023"]
                         ],
                         columns:
                        [
                            search.createColumn({
                                name: "amount",
                                summary: "SUM",
                                label: "Amount"
                            }),
                            search.createColumn({
                                name: "salesrep",
                                summary: "GROUP",
                                label: "Sales Rep"
                            })
                        ]
                    });
                    let resultCount = salesOrderSearch.run().count;
                    log.debug('Result Count', resultCount);
                }
            }
            catch(e){
                log.debug('Error@onRequest', e.message + e.stack);
            }
        }

        return {onRequest}

    });
