@AbapCatalog.viewEnhancementCategory: [#NONE]
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Categorias'
@Metadata.ignorePropagatedAnnotations: true
@ObjectModel.usageType:{
    serviceQuality: #X,
    sizeCategory:#S,
    dataClass: #MIXED
}
define view entity ZC_CATEG2_CJF as select from ztb_categ_cjf
{
    key bi_categ as Categoria,
    descripcion as Descripcion
}
